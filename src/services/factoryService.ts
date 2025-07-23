import { Machine, ProductionJob, Alert, MaintenanceTask, KPI } from '../types/factory';
import { generateMockMachines, generateMockJobs, generateMockAlerts, generateMockMaintenanceTasks } from './mockData';

class FactoryService {
  private machines: Machine[] = generateMockMachines();
  private jobs: ProductionJob[] = generateMockJobs();
  private alerts: Alert[] = generateMockAlerts();
  private maintenanceTasks: MaintenanceTask[] = generateMockMaintenanceTasks();

  // Simulate real-time data updates
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startRealTimeUpdates();
  }

  private startRealTimeUpdates() {
    this.updateInterval = setInterval(() => {
      this.updateMachineMetrics();
    }, 3000);
  }

  private updateMachineMetrics() {
    this.machines = this.machines.map(machine => ({
      ...machine,
      efficiency: this.simulateMetricChange(machine.efficiency, 70, 100),
      temperature: this.simulateMetricChange(machine.temperature, 60, 80),
      vibration: this.simulateMetricChange(machine.vibration, 0.5, 5.0),
      powerConsumption: this.simulateMetricChange(machine.powerConsumption, 2, 20),
    }));
  }

  private simulateMetricChange(current: number, min: number, max: number): number {
    const variation = (Math.random() - 0.5) * 2; // -1 to 1
    const newValue = current + variation;
    return Math.max(min, Math.min(max, Number(newValue.toFixed(1))));
  }

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

  acknowledgeAlert(id: string): void {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  getMaintenanceTasks(): MaintenanceTask[] {
    return this.maintenanceTasks.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  getKPIs(): KPI[] {
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

  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

export const factoryService = new FactoryService();