export interface Machine {
  id: string;
  name: string;
  type: 'CNC' | 'Assembly' | 'Quality Check' | 'Packaging' | '3D Printer';
  status: 'running' | 'idle' | 'maintenance' | 'error';
  efficiency: number;
  temperature: number;
  vibration: number;
  powerConsumption: number;
  cycleTime: number;
  output: number;
  location: string;
  lastMaintenance: Date;
  nextMaintenance: Date;
}

export interface ProductionJob {
  id: string;
  productName: string;
  quantity: number;
  completed: number;
  startTime: Date;
  estimatedEndTime: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedMachines: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

export interface Alert {
  id: string;
  machineId: string;
  machineName: string;
  type: 'warning' | 'error' | 'maintenance' | 'performance';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
}

export interface MaintenanceTask {
  id: string;
  machineId: string;
  machineName: string;
  type: 'preventive' | 'predictive' | 'corrective';
  description: string;
  scheduledDate: Date;
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue';
  assignedTechnician?: string;
}

export interface KPI {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  target?: number;
}