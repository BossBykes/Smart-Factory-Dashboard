import { Machine, ProductionJob, Alert, MaintenanceTask } from '../types/factory';

export const generateMockMachines = (): Machine[] => [
  {
    id: 'M001',
    name: 'CNC Mill Alpha',
    type: 'CNC',
    status: 'running',
    efficiency: 87,
    temperature: 68,
    vibration: 2.1,
    powerConsumption: 15.2,
    cycleTime: 4.2,
    output: 245,
    location: 'Floor A - Zone 1',
    lastMaintenance: new Date('2024-01-10'),
    nextMaintenance: new Date('2024-02-15')
  },
  {
    id: 'M002',
    name: 'Assembly Line Beta',
    type: 'Assembly',
    status: 'running',
    efficiency: 92,
    temperature: 72,
    vibration: 1.8,
    powerConsumption: 8.7,
    cycleTime: 2.8,
    output: 312,
    location: 'Floor A - Zone 2',
    lastMaintenance: new Date('2024-01-05'),
    nextMaintenance: new Date('2024-02-10')
  },
  {
    id: 'M003',
    name: 'Quality Scanner Gamma',
    type: 'Quality Check',
    status: 'idle',
    efficiency: 78,
    temperature: 65,
    vibration: 0.9,
    powerConsumption: 3.2,
    cycleTime: 1.5,
    output: 156,
    location: 'Floor B - Zone 1',
    lastMaintenance: new Date('2024-01-12'),
    nextMaintenance: new Date('2024-02-20')
  },
  {
    id: 'M004',
    name: 'Packaging Unit Delta',
    type: 'Packaging',
    status: 'error',
    efficiency: 45,
    temperature: 75,
    vibration: 4.2,
    powerConsumption: 12.1,
    cycleTime: 6.8,
    output: 67,
    location: 'Floor B - Zone 2',
    lastMaintenance: new Date('2024-01-08'),
    nextMaintenance: new Date('2024-02-12')
  },
  {
    id: 'M005',
    name: '3D Printer Epsilon',
    type: '3D Printer',
    status: 'maintenance',
    efficiency: 0,
    temperature: 55,
    vibration: 0.0,
    powerConsumption: 0.5,
    cycleTime: 0,
    output: 0,
    location: 'Floor C - Zone 1',
    lastMaintenance: new Date('2024-01-15'),
    nextMaintenance: new Date('2024-02-25')
  },
  {
    id: 'M006',
    name: 'CNC Lathe Zeta',
    type: 'CNC',
    status: 'running',
    efficiency: 95,
    temperature: 70,
    vibration: 1.6,
    powerConsumption: 18.4,
    cycleTime: 3.2,
    output: 289,
    location: 'Floor A - Zone 3',
    lastMaintenance: new Date('2024-01-03'),
    nextMaintenance: new Date('2024-02-08')
  }
];

export const generateMockJobs = (): ProductionJob[] => [
  {
    id: 'J001',
    productName: 'Engine Block V6',
    quantity: 50,
    completed: 32,
    startTime: new Date('2024-01-15T08:00:00'),
    estimatedEndTime: new Date('2024-01-17T16:00:00'),
    priority: 'high',
    assignedMachines: ['M001', 'M006'],
    status: 'in-progress'
  },
  {
    id: 'J002',
    productName: 'Gear Assembly Kit',
    quantity: 120,
    completed: 120,
    startTime: new Date('2024-01-12T06:00:00'),
    estimatedEndTime: new Date('2024-01-15T14:00:00'),
    priority: 'medium',
    assignedMachines: ['M002'],
    status: 'completed'
  },
  {
    id: 'J003',
    productName: 'Custom Prototype',
    quantity: 5,
    completed: 2,
    startTime: new Date('2024-01-16T10:00:00'),
    estimatedEndTime: new Date('2024-01-20T12:00:00'),
    priority: 'critical',
    assignedMachines: ['M005'],
    status: 'pending'
  }
];

export const generateMockAlerts = (): Alert[] => [
  {
    id: 'A001',
    machineId: 'M004',
    machineName: 'Packaging Unit Delta',
    type: 'error',
    message: 'Conveyor belt jam detected',
    timestamp: new Date('2024-01-15T14:32:00'),
    severity: 'critical',
    acknowledged: false
  },
  {
    id: 'A002',
    machineId: 'M001',
    machineName: 'CNC Mill Alpha',
    type: 'warning',
    message: 'Temperature rising above normal range',
    timestamp: new Date('2024-01-15T13:45:00'),
    severity: 'medium',
    acknowledged: true
  },
  {
    id: 'A003',
    machineId: 'M005',
    machineName: '3D Printer Epsilon',
    type: 'maintenance',
    message: 'Scheduled maintenance window starting',
    timestamp: new Date('2024-01-15T12:00:00'),
    severity: 'low',
    acknowledged: true
  }
];

export const generateMockMaintenanceTasks = (): MaintenanceTask[] => [
  {
    id: 'MT001',
    machineId: 'M005',
    machineName: '3D Printer Epsilon',
    type: 'preventive',
    description: 'Replace print head and calibrate axes',
    scheduledDate: new Date('2024-01-15T09:00:00'),
    estimatedDuration: 4,
    priority: 'medium',
    status: 'in-progress',
    assignedTechnician: 'John Smith'
  },
  {
    id: 'MT002',
    machineId: 'M004',
    machineName: 'Packaging Unit Delta',
    type: 'corrective',
    description: 'Fix conveyor belt alignment issue',
    scheduledDate: new Date('2024-01-15T15:00:00'),
    estimatedDuration: 2,
    priority: 'critical',
    status: 'scheduled',
    assignedTechnician: 'Sarah Johnson'
  },
  {
    id: 'MT003',
    machineId: 'M002',
    machineName: 'Assembly Line Beta',
    type: 'predictive',
    description: 'Replace worn drive belt based on vibration analysis',
    scheduledDate: new Date('2024-02-10T08:00:00'),
    estimatedDuration: 3,
    priority: 'medium',
    status: 'scheduled',
    assignedTechnician: 'Mike Chen'
  }
];