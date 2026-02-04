import { Machine, ProductionJob, Alert, MaintenanceTask, KPI } from '../types/factory';

class FactoryService {
  private machines: Machine[] = [];
  private jobs: ProductionJob[] = [];
  private alerts: Alert[] = [];
  private maintenanceTasks: MaintenanceTask[] = [];
  private kpis: KPI[] = [];
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.initializeWebSocket();
  }

  private toDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private normalizeAlert(alert: any): Alert {
    const timestamp = this.toDate(alert.timestamp) || new Date();
    const createdAt = this.toDate(alert.createdAt);
    const resolvedAt = this.toDate(alert.resolvedAt);
    return {
      ...alert,
      timestamp,
      ...(createdAt ? { createdAt } : {}),
      resolvedAt: resolvedAt ?? null
    } as Alert;
  }

  private normalizeMaintenanceTask(task: any): MaintenanceTask {
    const scheduledDate = this.toDate(task.scheduledDate);
    const dueDate = this.toDate(task.dueDate);
    const date = this.toDate(task.date);
    return {
      ...task,
      ...(scheduledDate ? { scheduledDate } : {}),
      ...(dueDate ? { dueDate } : {}),
      ...(date ? { date } : {})
    } as MaintenanceTask;
  }

  private normalizeJob(job: any): ProductionJob {
    const startTime = this.toDate(job.startTime);
    const endTime = this.toDate(job.endTime);
    const estimatedEndTime = this.toDate(job.estimatedEndTime);
    const scheduledStart = this.toDate(job.scheduledStart);
    const scheduledEnd = this.toDate(job.scheduledEnd);
    return {
      ...job,
      ...(startTime ? { startTime } : {}),
      ...(endTime ? { endTime } : {}),
      ...(estimatedEndTime ? { estimatedEndTime } : {}),
      ...(scheduledStart ? { scheduledStart } : {}),
      ...(scheduledEnd ? { scheduledEnd } : {})
    } as ProductionJob;
  }

  private normalizeMachine(machine: any): Machine {
    const lastMaintenance = this.toDate(machine.lastMaintenance);
    const nextMaintenance = this.toDate(machine.nextMaintenance);
    const lastUpdated = this.toDate(machine.lastUpdated);
    return {
      ...machine,
      ...(lastMaintenance ? { lastMaintenance } : {}),
      ...(nextMaintenance ? { nextMaintenance } : {}),
      ...(lastUpdated ? { lastUpdated } : {})
    } as Machine;
  }

  private initializeWebSocket() {
    try {
      // Close any existing socket before creating a new one
      if (this.websocket) {
        try { this.websocket.close(); } catch {}
        this.websocket = null;
      }

      // Connect to the Node.js WebSocket server
      const wsUrl = import.meta.env.PROD
        ? `ws://${window.location.hostname}:3000/dashboard`
        : 'ws://localhost:3000/dashboard';
        
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('🔗 Connected to Smart Factory Server');
        this.reconnectAttempts = 0;
        this.notifyListeners('connection', { status: 'connected' });
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.websocket.onclose = () => {
        console.log('🔌 Disconnected from Smart Factory Server');
        this.notifyListeners('connection', { status: 'disconnected' });
        this.attemptReconnect();
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyListeners('connection', { status: 'error', error });
      };
      
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.fallbackToMockData();
    }
  }

  private fallbackToMockData() {
    console.log('📝 Using mock data - WebSocket unavailable');
    // Import and use your existing mock data as fallback
    this.machines = this.generateMockMachines();
    this.jobs = this.generateMockJobs();
    this.alerts = this.generateMockAlerts();
    this.maintenanceTasks = this.generateMockMaintenanceTasks();
    this.kpis = this.calculateKPIs();
    this.startMockUpdates();
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.initializeWebSocket();
      }, 3000 * this.reconnectAttempts); // Exponential backoff
    } else {
      console.log('❌ Max reconnection attempts reached. Switching to mock data.');
      this.fallbackToMockData();
    }
  }

  private handleWebSocketMessage(message: any) {
    const { type, data } = message;
    
    switch (type) {
      case 'initial_data':
        this.machines = (data.machines || []).map((m: any) => this.normalizeMachine(m));
        this.alerts = (data.alerts || []).map((a: any) => this.normalizeAlert(a));
        this.maintenanceTasks = (data.maintenanceTasks || []).map((t: any) => this.normalizeMaintenanceTask(t));
        this.jobs = (data.jobs || []).map((j: any) => this.normalizeJob(j));
        this.kpis = data.kpis || [];
        this.notifyListeners('data_update', { type: 'initial' });
        break;
        
      case 'machine_update':
        const normalized = this.normalizeMachine(data);
        this.updateMachine(normalized);
        this.kpis = this.calculateKPIs();
        this.notifyListeners('machine_update', normalized);
        break;
        
      case 'alerts_update': {
        this.alerts = (data || []).map((a: any) => this.normalizeAlert(a));
        this.notifyListeners('alerts_update', this.alerts);
        break;
      }
        
      case 'command_error':
        this.notifyListeners('command_error', data);
        break;
        
      default:
        console.log('Unknown message type:', type);
    }
  }

  private updateMachine(machineData: Machine) {
    const index = this.machines.findIndex(m => m.id === machineData.id);
    if (index !== -1) {
      this.machines[index] = machineData;
    } else {
      this.machines.push(machineData);
    }
  }

  // Event listener system
  public addEventListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public removeEventListener(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Machine control methods
  public async startMachine(machineId: string): Promise<boolean> {
    return this.sendCommand(machineId, 'start');
  }

  public async stopMachine(machineId: string): Promise<boolean> {
    return this.sendCommand(machineId, 'stop');
  }

  public async emergencyStop(machineId: string): Promise<boolean> {
    return this.sendCommand(machineId, 'emergency_stop');
  }

  public async resetEmergency(machineId: string): Promise<boolean> {
    return this.sendCommand(machineId, 'reset_emergency');
  }

  public async setMaintenanceMode(machineId: string): Promise<boolean> {
    return this.sendCommand(machineId, 'maintenance_mode');
  }

  private async sendCommand(machineId: string, command: string): Promise<boolean> {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      try {
        const message = {
          type: 'machine_command',
          machineId: machineId,
          command: command,
          timestamp: Date.now()
        };
        
        this.websocket.send(JSON.stringify(message));
        console.log(`🎮 Command sent: ${command} to ${machineId}`);
        return true;
      } catch (error) {
        console.error('Failed to send command:', error);
        return false;
      }
    } else {
      console.warn('WebSocket not connected. Command not sent.');
      // In mock mode, simulate command execution
      this.simulateCommand(machineId, command);
      return false;
    }
  }

  private simulateCommand(machineId: string, command: string) {
    const machine = this.machines.find(m => m.id === machineId);
    if (machine) {
      switch (command) {
        case 'start':
          machine.status = 'running';
          break;
        case 'stop':
          machine.status = 'idle';
          break;
        case 'emergency_stop':
          machine.status = 'error';
          break;
        case 'maintenance_mode':
          machine.status = 'maintenance';
          break;
      }
      this.notifyListeners('machine_update', machine);
    }
  }

  // Alert management
  public acknowledgeAlert(alertId: string): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'acknowledge_alert',
        alertId: alertId,
        timestamp: Date.now()
      };
      this.websocket.send(JSON.stringify(message));
    }
    
    // Update locally
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.notifyListeners('alerts_update', this.alerts);
    }
  }

  // Data access methods
  getAllMachines(): Machine[] {
    return this.machines;
  }

  getMachine(id: string): Machine | undefined {
    return this.machines.find(machine => machine.id === id);
  }

  getProductionJobs(): ProductionJob[] {
    return this.jobs;
  }

  getAlerts(): Alert[] {
    return this.alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getUnacknowledgedAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  getMaintenanceTasks(): MaintenanceTask[] {
    return this.maintenanceTasks.sort((a, b) => {
      const ta = a.scheduledDate?.getTime?.() ?? 0;
      const tb = b.scheduledDate?.getTime?.() ?? 0;
      return ta - tb;
    });
  }

  getKPIs(): KPI[] {
    return this.kpis;
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'error' {
    if (this.websocket) {
      switch (this.websocket.readyState) {
        case WebSocket.OPEN:
          return 'connected';
        case WebSocket.CONNECTING:
          return 'disconnected';
        default:
          return 'error';
      }
    }
    return 'error';
  }

  // Mock data generators (fallback)
  private generateMockMachines(): Machine[] {
    return [
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
      // Add other mock machines...
    ];
  }

  private generateMockJobs(): ProductionJob[] {
    return [
      {
        id: 'J001',
        productName: 'Engine Block V6',
        quantity: 50,
        completed: 32,
        startTime: new Date('2024-01-15T08:00:00'),
        estimatedEndTime: new Date('2024-01-17T16:00:00'),
        priority: 'high',
        assignedMachines: ['M001'],
        status: 'in-progress'
      }
    ];
  }

  private generateMockAlerts(): Alert[] {
    return [
      {
        id: 'A001',
        machineId: 'M001',
        machineName: 'CNC Mill Alpha',
        type: 'warning',
        message: 'Temperature rising above normal range',
        timestamp: new Date(),
        severity: 'medium',
        acknowledged: false
      }
    ];
  }

  private generateMockMaintenanceTasks(): MaintenanceTask[] {
    return [
      {
        id: 'MT001',
        machineId: 'M001',
        machineName: 'CNC Mill Alpha',
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

  private calculateKPIs(): KPI[] {
    const runningMachines = this.machines.filter(m => m.status === 'running');
    const totalEfficiency = runningMachines.reduce((sum, m) => sum + m.efficiency, 0);
    const avgEfficiency = runningMachines.length > 0 ? totalEfficiency / runningMachines.length : 0;

    const totalOutput = this.machines.reduce((sum, m) => sum + m.output, 0);
    const totalPower = this.machines.reduce((sum, m) => sum + m.powerConsumption, 0);
    
    const activeJobs = this.jobs.filter(j => j.status === 'in-progress');
    const completedToday = this.jobs.filter(j => j.status === 'completed').length;

    return [
      {
        name: 'Overall Efficiency',
        value: Math.round(avgEfficiency),
        unit: '%',
        trend: avgEfficiency > 85 ? 'up' : avgEfficiency > 75 ? 'stable' : 'down',
        target: 90
      },
      {
        name: 'Daily Output',
        value: totalOutput,
        unit: 'units',
        trend: 'up',
        target: 1500
      },
      {
        name: 'Power Consumption',
        value: Math.round(totalPower * 10) / 10,
        unit: 'kW',
        trend: 'stable',
        target: 65
      },
      {
        name: 'Active Jobs',
        value: activeJobs.length,
        unit: 'jobs',
        trend: 'stable'
      },
      {
        name: 'Completed Today',
        value: completedToday,
        unit: 'jobs',
        trend: 'up',
        target: 5
      },
      {
        name: 'Machine Uptime',
        value: Math.round(((this.machines.length - this.machines.filter(m => m.status === 'error' || m.status === 'maintenance').length) / this.machines.length) * 100),
        unit: '%',
        trend: 'stable',
        target: 95
      }
    ];
  }

  private startMockUpdates() {
    // Simulate real-time updates for mock data
    setInterval(() => {
      this.machines = this.machines.map(machine => ({
        ...machine,
        efficiency: this.simulateMetricChange(machine.efficiency, 70, 100),
        temperature: this.simulateMetricChange(machine.temperature, 60, 80),
        vibration: this.simulateMetricChange(machine.vibration, 0.5, 5.0),
        powerConsumption: this.simulateMetricChange(machine.powerConsumption, 2, 20),
      }));
      
      this.kpis = this.calculateKPIs();
      this.notifyListeners('data_update', { type: 'mock_update' });
    }, 3000);
  }

  private simulateMetricChange(current: number, min: number, max: number): number {
    const variation = (Math.random() - 0.5) * 2; // -1 to 1
    const newValue = current + variation;
    return Math.max(min, Math.min(max, Number(newValue.toFixed(1))));
  }

  cleanup() {
    if (this.websocket) {
      this.websocket.close();
    }
    this.listeners.clear();
  }
}

export const factoryService = new FactoryService();
