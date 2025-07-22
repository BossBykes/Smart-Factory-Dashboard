// src/utils/mockData.ts

import { MachineStatus, SensorData, Alert, ProductionMetrics } from '../types/machine.types';

// Mock machines
export const mockMachines: MachineStatus[] = [
  {
    id: 'cnc-001',
    name: 'CNC Machine Alpha',
    type: 'CNC',
    status: 'running',
    location: 'Floor A - Station 1',
    lastUpdate: new Date()
  },
  {
    id: 'assembly-001',
    name: 'Assembly Robot Beta',
    type: 'Assembly',
    status: 'idle',
    location: 'Floor A - Station 2',
    lastUpdate: new Date()
  },
  {
    id: 'qc-001',
    name: 'Quality Control Gamma',
    type: 'QualityControl',
    status: 'error',
    location: 'Floor B - Station 1',
    lastUpdate: new Date()
  }
];

// Generate realistic sensor data
export const generateSensorData = (machineId: string): SensorData => {
  const baseTemp = machineId.includes('cnc') ? 45 : 35;
  const basePower = machineId.includes('cnc') ? 2.5 : 1.8;
  
  return {
    id: `sensor-${Date.now()}-${Math.random()}`,
    machineId,
    timestamp: new Date(),
    temperature: baseTemp + (Math.random() - 0.5) * 10,
    vibration: Math.random() > 0.9, // 10% chance of vibration
    powerConsumption: basePower + (Math.random() - 0.5) * 0.5,
    productionCount: Math.floor(Math.random() * 1000),
    healthScore: 85 + Math.random() * 15
  };
};

// Mock alerts
export const mockAlerts: Alert[] = [
  {
    id: 'alert-001',
    machineId: 'qc-001',
    machineName: 'Quality Control Gamma',
    type: 'error',
    message: 'Temperature exceeded safe operating limits (65°C)',
    timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
    acknowledged: false
  },
  {
    id: 'alert-002',
    machineId: 'cnc-001',
    machineName: 'CNC Machine Alpha',
    type: 'warning',
    message: 'Vibration levels above normal range',
    timestamp: new Date(Date.now() - 15 * 60000), // 15 minutes ago
    acknowledged: false
  },
  {
    id: 'alert-003',
    machineId: 'assembly-001',
    machineName: 'Assembly Robot Beta',
    type: 'info',
    message: 'Scheduled maintenance due in 2 days',
    timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
    acknowledged: true
  }
];

// Generate production metrics
export const generateProductionMetrics = (): ProductionMetrics[] => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  return mockMachines.flatMap(machine => 
    last7Days.map(date => ({
      machineId: machine.id,
      date,
      unitsProduced: Math.floor(Math.random() * 200) + 50,
      efficiency: Math.random() * 20 + 80, // 80-100%
      downtime: Math.random() * 60, // 0-60 minutes
      qualityScore: Math.random() * 10 + 90 // 90-100%
    }))
  );
};

// Simulate real-time data updates
export const createRealtimeDataStream = (callback: (data: SensorData[]) => void) => {
  const interval = setInterval(() => {
    const realtimeData = mockMachines.map(machine => 
      generateSensorData(machine.id)
    );
    callback(realtimeData);
  }, 2000); // Update every 2 seconds

  return () => clearInterval(interval);
};