const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// WebSocket server for Arduino connections
const arduinoWss = new WebSocket.Server({ port: 3001 });

// WebSocket server for React dashboard
const dashboardWss = new WebSocket.Server({ server, path: '/dashboard' });

// In-memory data store (you could use Redis or a database)
const machineData = new Map();
const alerts = [];
const ALERT_COOLDOWN_MS = 120 * 1000;
const maintenanceTasks = [];

// Connected clients
const arduinoClients = new Map();
const dashboardClients = new Set();

console.log(' Smart Factory Server Starting...');

// Arduino WebSocket Handler
arduinoWss.on('connection', (ws, req) => {
  console.log(' Arduino device connected');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleArduinoMessage(message, ws);
    } catch (error) {
      console.error('Error parsing Arduino message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(' Arduino device disconnected');
    // Remove from clients map
    for (const [machineId, client] of arduinoClients.entries()) {
      if (client === ws) {
        arduinoClients.delete(machineId);
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('Arduino WebSocket error:', error);
  });
});

// Dashboard WebSocket Handler
dashboardWss.on('connection', (ws, req) => {
  console.log(' Dashboard connected');
  dashboardClients.add(ws);
  
  // Send initial data to dashboard
  sendInitialData(ws);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleDashboardMessage(message);
    } catch (error) {
      console.error('Error parsing dashboard message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(' Dashboard disconnected');
    dashboardClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('Dashboard WebSocket error:', error);
  });
});

function handleArduinoMessage(message, sourceWs) {
  const { type, machineId } = message;

  if (type === 'command_ack') {
    broadcastToDashboard({
      type: 'command_ack',
      data: message
    });
    return;
  }
  
  if (type === 'machine_data') {
    const maintenanceInfo = getMaintenanceInfo(machineId);

    // Store machine data
    const machineInfo = {
      id: machineId,
      name: getMachineName(machineId),
      type: getMachineType(machineId),
      status: message.status,
      efficiency: message.efficiency,
      temperature: message.temperature,
      vibration: message.vibration,
      powerConsumption: message.powerConsumption,
      output: message.output,
      location: getMachineLocation(machineId),
      lastUpdated: new Date(),
      cycleTime: calculateCycleTime(machineId, message),
      lastMaintenance: maintenanceInfo.lastMaintenance,
      nextMaintenance: maintenanceInfo.nextMaintenance
    };
    
    machineData.set(machineId, machineInfo);
    
    // Register the socket that actually sent this machine's data.
    if (sourceWs && sourceWs.readyState === WebSocket.OPEN) {
      arduinoClients.set(machineId, sourceWs);
    }
    
    // Check for alerts
    checkForAlerts(machineInfo);
    
    // Broadcast to all dashboard clients
    broadcastToDashboard({
      type: 'machine_update',
      data: machineInfo
    });
    
    console.log(` Updated data for ${machineId}: ${message.status} - ${message.temperature}°C`);
  }
}

function handleDashboardMessage(message) {
  const { type, command, machineId } = message;
  
  if (type === 'machine_command') {
    const commandId = message.commandId || `CMD-${Date.now()}-${machineId}`;

    // Forward command to specific Arduino
    const arduinoClient = arduinoClients.get(machineId);
    
    if (arduinoClient && arduinoClient.readyState === WebSocket.OPEN) {
      arduinoClient.send(JSON.stringify({
        commandId: commandId,
        command: command,
        machineId: machineId,
        timestamp: Date.now()
      }));
      
      console.log(` Command sent to ${machineId}: ${command}`);
    } else {
      console.log(` Machine ${machineId} not connected`);
      
      broadcastToDashboard({
        type: 'command_ack',
        data: {
          commandId: commandId,
          machineId: machineId,
          command: command,
          accepted: false,
          applied: false,
          status: 'not_connected',
          message: 'Machine not connected',
          timestamp: new Date().toISOString()
        }
      });
    }
  } else if (type === 'acknowledge_alert') {
    const alert = alerts.find(a => a.id === message.alertId);
    if (alert) {
      alert.acknowledged = true;
      broadcastAlertsUpdate();
    }
  }
}

function checkForAlerts(machine) {
  let changed = false;

  // Temperature alert with hysteresis
  if (machine.temperature >= 80) {
    changed = upsertAlert(machine, 'temp_high', 'high', 'High temperature detected', 'warning') || changed;
  } else if (machine.temperature <= 75) {
    changed = resolveAlert(machine.id, 'temp_high') || changed;
  }
  
  // Vibration alert with hysteresis
  if (machine.vibration >= 4.0) {
    changed = upsertAlert(machine, 'vibration_high', 'medium', 'Excessive vibration detected', 'warning') || changed;
  } else if (machine.vibration <= 3.2) {
    changed = resolveAlert(machine.id, 'vibration_high') || changed;
  }
  
  // Error status alert
  if (machine.status === 'error') {
    changed = upsertAlert(machine, 'machine_error', 'critical', 'Machine error state', 'error') || changed;
  } else {
    changed = resolveAlert(machine.id, 'machine_error') || changed;
  }
  
  // Low efficiency alert (no hysteresis defined)
  if (machine.efficiency < 70 && machine.status === 'running') {
    changed = upsertAlert(machine, 'low_efficiency', 'medium', 'Low efficiency detected', 'performance') || changed;
  } else {
    changed = resolveAlert(machine.id, 'low_efficiency') || changed;
  }

  if (changed) {
    broadcastAlertsUpdate();
  }
}

function upsertAlert(machine, ruleKey, severity, message, type) {
  const now = Date.now();
  const existing = alerts.find(alert => 
    alert.machineId === machine.id &&
    alert.ruleKey === ruleKey &&
    alert.status === 'active'
  );
  
  if (existing) {
    return false;
  }
  
  const lastAlert = [...alerts].reverse().find(alert =>
    alert.machineId === machine.id &&
    alert.ruleKey === ruleKey
  );
  
  if (lastAlert) {
    // Cooldown: avoid creating a new alert too soon after the last one
    const lastCreatedAt = new Date(lastAlert.createdAt || lastAlert.timestamp || now).getTime();
    if (now - lastCreatedAt < ALERT_COOLDOWN_MS) {
      return false;
    }
  }
  
  const alert = {
    id: `A-${now}-${Math.random().toString(36).substr(2, 9)}`,
    machineId: machine.id,
    machineName: machine.name,
    type: type,
    message: message,
    severity: severity,
    ruleKey: ruleKey,
    status: 'active',
    createdAt: new Date(now).toISOString(),
    resolvedAt: null,
    timestamp: new Date(now),
    acknowledged: false
  };
  
  alerts.push(alert);
  
  // Keep only last 50 alerts
  if (alerts.length > 50) {
    alerts.splice(0, alerts.length - 50);
  }
  
  console.log(` Alert created: ${machine.name} - ${message}`);
  return true;
}

function resolveAlert(machineId, ruleKey) {
  const existing = alerts.find(alert => 
    alert.machineId === machineId &&
    alert.ruleKey === ruleKey &&
    alert.status === 'active'
  );
  
  if (existing) {
    existing.status = 'resolved';
    existing.resolvedAt = new Date().toISOString();
    console.log(` Alert resolved: ${existing.machineName} - ${existing.message}`);
    return true;
  }
  return false;
}

function sendInitialData(ws) {
  // Send current machine data
  const machines = Array.from(machineData.values());
  ws.send(JSON.stringify({
    type: 'initial_data',
    data: {
      machines: machines,
      alerts: alerts.slice(-10),
      maintenanceTasks: generateMaintenanceTasks(),
      jobs: generateProductionJobs(),
      kpis: calculateKPIs(machines)
    }
  }));
}

function broadcastToDashboard(message) {
  dashboardClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastAlertsUpdate() {
  broadcastToDashboard({
    type: 'alerts_update',
    data: alerts.slice(-50)
  });
}

// Utility functions
function getMaintenanceInfo(machineId) {
  const schedules = {
    M001: { lastDaysAgo: 5, nextDaysFromNow: 25 },
    M002: { lastDaysAgo: 12, nextDaysFromNow: 18 },
    M003: { lastDaysAgo: 20, nextDaysFromNow: 10 },
    M004: { lastDaysAgo: 8, nextDaysFromNow: 22 },
    M005: { lastDaysAgo: 15, nextDaysFromNow: 15 },
    M006: { lastDaysAgo: 3, nextDaysFromNow: 27 },
  };

  const schedule = schedules[machineId] || { lastDaysAgo: 10, nextDaysFromNow: 20 };
  const dayMs = 24 * 60 * 60 * 1000;

  return {
    lastMaintenance: new Date(Date.now() - schedule.lastDaysAgo * dayMs),
    nextMaintenance: new Date(Date.now() + schedule.nextDaysFromNow * dayMs),
  };
}

function getMachineName(machineId) {
  const names = {
    'M001': 'CNC Mill Alpha',
    'M002': 'Assembly Line Beta',
    'M003': 'Quality Scanner Gamma',
    'M004': 'Packaging Unit Delta',
    'M005': '3D Printer Epsilon',
    'M006': 'CNC Lathe Zeta'
  };
  return names[machineId] || `Machine ${machineId}`;
}

function getMachineType(machineId) {
  const types = {
    'M001': 'CNC',
    'M002': 'Assembly',
    'M003': 'Quality Check',
    'M004': 'Packaging',
    'M005': '3D Printer',
    'M006': 'CNC'
  };
  return types[machineId] || 'Unknown';
}

function getMachineLocation(machineId) {
  const locations = {
    'M001': 'Floor A - Zone 1',
    'M002': 'Floor A - Zone 2',
    'M003': 'Floor B - Zone 1',
    'M004': 'Floor B - Zone 2',
    'M005': 'Floor C - Zone 1',
    'M006': 'Floor A - Zone 3'
  };
  return locations[machineId] || 'Unknown Location';
}

function calculateCycleTime(machineId, data) {
  const baseCycleTimes = {
    M001: 2.4,
    M002: 3.1,
    M003: 1.8,
    M004: 2.9,
    M005: 4.2,
    M006: 2.6,
  };

  const base = baseCycleTimes[machineId] || 3.0;

  if (data.status === 'idle' || data.status === 'maintenance' || data.status === 'error') {
    return 0;
  }

  if (data.efficiency >= 90) return base;
  if (data.efficiency >= 80) return Number((base + 0.3).toFixed(1));
  if (data.efficiency >= 70) return Number((base + 0.6).toFixed(1));
  return Number((base + 1.0).toFixed(1));
}

function generateMaintenanceTasks() {
  const taskDetails = {
    M001: { estimatedDuration: 4, priority: 'medium', assignedTechnician: 'John Smith' },
    M002: { estimatedDuration: 3, priority: 'high', assignedTechnician: 'Maria Garcia' },
    M003: { estimatedDuration: 2, priority: 'low', assignedTechnician: 'Alex Johnson' },
    M004: { estimatedDuration: 3, priority: 'medium', assignedTechnician: 'Priya Patel' },
    M005: { estimatedDuration: 5, priority: 'medium', assignedTechnician: 'Chen Wei' },
    M006: { estimatedDuration: 4, priority: 'high', assignedTechnician: 'Sam Taylor' }
  };

  return Object.keys(taskDetails).map(machineId => {
    const details = taskDetails[machineId];
    const maintenanceInfo = getMaintenanceInfo(machineId);

    return {
      id: `MT-${machineId}`,
      machineId: machineId,
      machineName: getMachineName(machineId),
      type: 'preventive',
      description: 'Scheduled preventive maintenance and inspection',
      scheduledDate: maintenanceInfo.nextMaintenance,
      estimatedDuration: details.estimatedDuration,
      priority: details.priority,
      status: 'scheduled',
      assignedTechnician: details.assignedTechnician
    };
  });
}

function generateProductionJobs() {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  return [
    {
      id: 'J001',
      productName: 'Engine Component',
      quantity: 50,
      completed: 32,
      startTime: new Date(now - 4 * hourMs),
      estimatedEndTime: new Date(now + 6 * hourMs),
      priority: 'high',
      assignedMachines: ['M001'],
      status: 'in-progress'
    },
    {
      id: 'J002',
      productName: 'Assembly Module',
      quantity: 40,
      completed: 18,
      startTime: new Date(now - 2 * hourMs),
      estimatedEndTime: new Date(now + 5 * hourMs),
      priority: 'medium',
      assignedMachines: ['M002', 'M003'],
      status: 'in-progress'
    },
    {
      id: 'J003',
      productName: 'Packaging Batch',
      quantity: 60,
      completed: 45,
      startTime: new Date(now - 6 * hourMs),
      estimatedEndTime: new Date(now + 3 * hourMs),
      priority: 'medium',
      assignedMachines: ['M004'],
      status: 'in-progress'
    }
  ];
}

function calculateKPIs(machines) {
  const runningMachines = machines.filter(m => m.status === 'running');
  const totalEfficiency = runningMachines.reduce((sum, m) => sum + m.efficiency, 0);
  const avgEfficiency = runningMachines.length > 0 ? totalEfficiency / runningMachines.length : 0;
  
  return [
    {
      name: 'Overall Efficiency',
      value: Math.round(avgEfficiency),
      unit: '%',
      trend: avgEfficiency > 85 ? 'up' : 'down',
      target: 90
    },
    {
      name: 'Active Machines',
      value: runningMachines.length,
      unit: 'machines',
      trend: 'stable'
    },
    {
      name: 'Total Output',
      value: machines.reduce((sum, m) => sum + m.output, 0),
      unit: 'units',
      trend: 'up'
    }
  ];
}

// REST API endpoints for dashboard
app.get('/api/machines', (req, res) => {
  const machines = Array.from(machineData.values());
  res.json(machines);
});

app.get('/api/alerts', (req, res) => {
  res.json(alerts.slice(-20));
});

app.post('/api/machine/:id/command', (req, res) => {
  const machineId = req.params.id;
  const { command } = req.body;
  
  const arduinoClient = arduinoClients.get(machineId);
  
  if (arduinoClient && arduinoClient.readyState === WebSocket.OPEN) {
    const commandId = `REST-${Date.now()}-${machineId}`;

    arduinoClient.send(JSON.stringify({
      commandId: commandId,
      command: command,
      machineId: machineId,
      timestamp: Date.now()
    }));
    
    res.json({ success: true, message: `Command ${command} sent to ${machineId}` });
  } else {
    res.status(404).json({ success: false, message: 'Machine not connected' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    connectedArduinos: arduinoClients.size,
    connectedDashboards: dashboardClients.size,
    uptime: process.uptime()
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n Smart Factory Server running on port ${PORT}`);
  console.log(` Dashboard WebSocket: ws://localhost:${PORT}/dashboard`);
  console.log(` Arduino WebSocket: ws://localhost:3001`);
  console.log(` REST API: http://localhost:${PORT}/api`);
  console.log('\n Ready for connections!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n Shutting down Smart Factory Server...');
  arduinoWss.close();
  dashboardWss.close();
  server.close();
  process.exit(0);
});

// Periodic cleanup
setInterval(() => {
  // Remove old alerts (older than 24 hours)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const initialLength = alerts.length;
  
  for (let i = alerts.length - 1; i >= 0; i--) {
    if (alerts[i].timestamp.getTime() < oneDayAgo) {
      alerts.splice(i, 1);
    }
  }
  
  if (alerts.length !== initialLength) {
    console.log(` Cleaned up ${initialLength - alerts.length} old alerts`);
  }
}, 60 * 60 * 1000); // Run every hour
