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
const maintenanceTasks = [];

// Connected clients
const arduinoClients = new Map();
const dashboardClients = new Set();

console.log('🏭 Smart Factory Server Starting...');

// Arduino WebSocket Handler
arduinoWss.on('connection', (ws, req) => {
  console.log('🔧 Arduino device connected');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleArduinoMessage(message);
    } catch (error) {
      console.error('Error parsing Arduino message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔧 Arduino device disconnected');
    // Remove from clients map
    for (const [machineId, client] of arduinoClients.entries()) {
      if (client === ws) {
        arduinoClients.delete(machineId);
        break;
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('Arduino WebSocket error:', error);
  });
});

// Dashboard WebSocket Handler
dashboardWss.on('connection', (ws, req) => {
  console.log('📱 Dashboard connected');
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
    console.log('📱 Dashboard disconnected');
    dashboardClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('Dashboard WebSocket error:', error);
  });
});

function handleArduinoMessage(message) {
  const { type, machineId } = message;
  
  if (type === 'machine_data') {
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
      cycleTime: calculateCycleTime(message),
      lastMaintenance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      nextMaintenance: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000)
    };
    
    machineData.set(machineId, machineInfo);
    
    // Register Arduino client
    const ws = [...arduinoWss.clients].find(client => 
      client.readyState === WebSocket.OPEN
    );
    if (ws) {
      arduinoClients.set(machineId, ws);
    }
    
    // Check for alerts
    checkForAlerts(machineInfo);
    
    // Broadcast to all dashboard clients
    broadcastToDashboard({
      type: 'machine_update',
      data: machineInfo
    });
    
    console.log(`📊 Updated data for ${machineId}: ${message.status} - ${message.temperature}°C`);
  }
}

function handleDashboardMessage(message) {
  const { type, command, machineId } = message;
  
  if (type === 'machine_command') {
    // Forward command to specific Arduino
    const arduinoClient = arduinoClients.get(machineId);
    
    if (arduinoClient && arduinoClient.readyState === WebSocket.OPEN) {
      arduinoClient.send(JSON.stringify({
        command: command,
        machineId: machineId,
        timestamp: Date.now()
      }));
      
      console.log(`🎮 Command sent to ${machineId}: ${command}`);
      
      // Log command in alerts for dashboard
      alerts.push({
        id: `CMD-${Date.now()}`,
        machineId: machineId,
        machineName: getMachineName(machineId),
        type: 'performance',
        message: `Remote command executed: ${command}`,
        timestamp: new Date(),
        severity: 'low',
        acknowledged: false
      });
      
      // Broadcast updated alerts
      broadcastToDashboard({
        type: 'alerts_update',
        data: alerts.slice(-10) // Last 10 alerts
      });
      
    } else {
      console.log(`❌ Machine ${machineId} not connected`);
      
      // Send error back to dashboard
      broadcastToDashboard({
        type: 'command_error',
        data: {
          machineId: machineId,
          message: 'Machine not connected'
        }
      });
    }
  } else if (type === 'acknowledge_alert') {
    const alert = alerts.find(a => a.id === message.alertId);
    if (alert) {
      alert.acknowledged = true;
      broadcastToDashboard({
        type: 'alerts_update',
        data: alerts.slice(-10)
      });
    }
  }
}

function checkForAlerts(machine) {
  const now = new Date();
  
  // Temperature alert
  if (machine.temperature > 75) {
    createAlert(machine, 'warning', 'High temperature detected', 'high');
  }
  
  // Vibration alert
  if (machine.vibration > 3.5) {
    createAlert(machine, 'warning', 'Excessive vibration detected', 'medium');
  }
  
  // Error status alert
  if (machine.status === 'error') {
    createAlert(machine, 'error', 'Machine error state', 'critical');
  }
  
  // Low efficiency alert
  if (machine.efficiency < 70 && machine.status === 'running') {
    createAlert(machine, 'performance', 'Low efficiency detected', 'medium');
  }
}

function createAlert(machine, type, message, severity) {
  // Check if similar alert exists in last 5 minutes
  const recentAlert = alerts.find(alert => 
    alert.machineId === machine.id &&
    alert.type === type &&
    alert.message === message &&
    (Date.now() - alert.timestamp.getTime()) < 5 * 60 * 1000
  );
  
  if (!recentAlert) {
    const alert = {
      id: `A-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      machineId: machine.id,
      machineName: machine.name,
      type: type,
      message: message,
      timestamp: new Date(),
      severity: severity,
      acknowledged: false
    };
    
    alerts.push(alert);
    
    // Keep only last 50 alerts
    if (alerts.length > 50) {
      alerts.splice(0, alerts.length - 50);
    }
    
    console.log(`🚨 Alert created: ${machine.name} - ${message}`);
  }
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

// Utility functions
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

function calculateCycleTime(data) {
  // Simple cycle time calculation based on efficiency
  return data.efficiency > 80 ? Math.random() * 2 + 2 : Math.random() * 4 + 3;
}

function generateMaintenanceTasks() {
  return [
    {
      id: 'MT001',
      machineId: 'M001',
      machineName: getMachineName('M001'),
      type: 'preventive',
      description: 'Routine maintenance and calibration',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      estimatedDuration: 4,
      priority: 'medium',
      status: 'scheduled',
      assignedTechnician: 'John Smith'
    }
  ];
}

function generateProductionJobs() {
  return [
    {
      id: 'J001',
      productName: 'Engine Component',
      quantity: 50,
      completed: Math.floor(Math.random() * 30) + 10,
      startTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      estimatedEndTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
      priority: 'high',
      assignedMachines: ['M001'],
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
    arduinoClient.send(JSON.stringify({
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
  console.log(`\n🚀 Smart Factory Server running on port ${PORT}`);
  console.log(`📱 Dashboard WebSocket: ws://localhost:${PORT}/dashboard`);
  console.log(`🔧 Arduino WebSocket: ws://localhost:3001`);
  console.log(`🌐 REST API: http://localhost:${PORT}/api`);
  console.log('\n💡 Ready for connections!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Smart Factory Server...');
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
    console.log(`🧹 Cleaned up ${initialLength - alerts.length} old alerts`);
  }
}, 60 * 60 * 1000); // Run every hour