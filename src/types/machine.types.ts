// src/types/machine.types.ts

export interface MachineStatus {
  id: string;
  name: string;
  type: 'CNC' | 'Assembly' | 'QualityControl';
  status: 'running' | 'idle' | 'error' | 'maintenance';
  location: string;
  lastUpdate: Date;
}

export interface SensorData {
  id: string;
  machineId: string;
  timestamp: Date;
  temperature: number;
  vibration: boolean;
  powerConsumption: number;
  productionCount: number;
  healthScore: number;
}

export interface Alert {
  id: string;
  machineId: string;
  machineName: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface ProductionMetrics {
  machineId: string;
  date: string;
  unitsProduced: number;
  efficiency: number;
  downtime: number;
  qualityScore: number;
}

export interface MachineCommand {
  machineId: string;
  command: 'start' | 'stop' | 'pause' | 'reset' | 'maintenance';
  timestamp: Date;
}

export interface DashboardData {
  machines: MachineStatus[];
  sensorData: SensorData[];
  alerts: Alert[];
  productionMetrics: ProductionMetrics[];
}