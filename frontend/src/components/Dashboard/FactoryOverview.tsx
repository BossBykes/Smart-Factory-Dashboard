import React, { useState, useEffect, useMemo } from 'react';
import { factoryService } from '../../services/factoryService';
import { Alert, KPI, Machine, MaintenanceTask, ProductionJob } from '../../types/factory';
import { getStatusColor, getStatusBgColor, cn } from '../../utils/helpers';
import { KPICard } from './KPICard';

interface FactoryOverviewProps {
  onMachineSelect: (machineId: string) => void;
}

const stateSummaryConfig: Array<{
  status: Machine['status'];
  label: string;
  description: string;
  accentClass: string;
  dotClass: string;
}> = [
  {
    status: 'running',
    label: 'Running',
    description: 'Producing now',
    accentClass: 'border-green-500/30 bg-green-500/10',
    dotClass: 'bg-green-400'
  },
  {
    status: 'idle',
    label: 'Idle',
    description: 'Ready to dispatch',
    accentClass: 'border-yellow-500/30 bg-yellow-500/10',
    dotClass: 'bg-yellow-400'
  },
  {
    status: 'maintenance',
    label: 'Maintenance',
    description: 'Service hold',
    accentClass: 'border-blue-500/30 bg-blue-500/10',
    dotClass: 'bg-blue-400'
  },
  {
    status: 'error',
    label: 'Error',
    description: 'Needs intervention',
    accentClass: 'border-red-500/30 bg-red-500/10',
    dotClass: 'bg-red-400'
  }
];

const statusDotClass: Record<Machine['status'], string> = {
  running: 'bg-green-400 animate-pulse',
  idle: 'bg-yellow-400',
  maintenance: 'bg-blue-400',
  error: 'bg-red-400 animate-pulse'
};

const severityClass: Record<Alert['severity'], string> = {
  low: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
  medium: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
  high: 'text-orange-300 bg-orange-500/10 border-orange-500/30',
  critical: 'text-red-300 bg-red-500/10 border-red-500/30'
};

const formatLabel = (value: string) => value.replace('-', ' ');

const getDateTime = (date?: Date) => date instanceof Date ? date.getTime() : 0;

export const FactoryOverview: React.FC<FactoryOverviewProps> = ({ onMachineSelect }) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);

  useEffect(() => {
    const updateData = () => {
      setMachines(factoryService.getAllMachines());
      setKPIs(factoryService.getKPIs());
      setAlerts(factoryService.getAlerts());
      setJobs(factoryService.getProductionJobs());
      setMaintenanceTasks(factoryService.getMaintenanceTasks());
    };

    updateData();
    const handleDataUpdate = () => updateData();
    const handleMachineUpdate = () => updateData();
    const handleAlertsUpdate = () => updateData();

    factoryService.addEventListener('data_update', handleDataUpdate);
    factoryService.addEventListener('machine_update', handleMachineUpdate);
    factoryService.addEventListener('alerts_update', handleAlertsUpdate);

    return () => {
      factoryService.removeEventListener('data_update', handleDataUpdate);
      factoryService.removeEventListener('machine_update', handleMachineUpdate);
      factoryService.removeEventListener('alerts_update', handleAlertsUpdate);
    };
  }, []);

  const machinesById = useMemo(() => {
    return new Map(machines.map((machine) => [machine.id, machine]));
  }, [machines]);

  const machineStateSummary = useMemo(() => {
    return stateSummaryConfig.map((item) => ({
      ...item,
      count: machines.filter((machine) => machine.status === item.status).length
    }));
  }, [machines]);

  const activeJobs = useMemo(() => {
    return jobs.filter((job) => job.status === 'in-progress');
  }, [jobs]);

  const blockedJobs = useMemo(() => {
    return activeJobs.filter((job) =>
      job.assignedMachines.some((machineId) => {
        const machine = machinesById.get(machineId);
        return machine?.status === 'error' || machine?.status === 'maintenance';
      })
    );
  }, [activeJobs, machinesById]);

  const unacknowledgedAlerts = useMemo(() => {
    return alerts.filter((alert) => !alert.acknowledged && alert.status !== 'resolved');
  }, [alerts]);

  const machinesNeedingAttention = useMemo(() => {
    return machines.filter((machine) => machine.status === 'error' || machine.status === 'maintenance');
  }, [machines]);

  const upcomingMaintenanceCount = useMemo(() => {
    const now = Date.now();
    const fourteenDaysFromNow = now + 14 * 24 * 60 * 60 * 1000;

    return maintenanceTasks.filter((task) => {
      const scheduledTime = getDateTime(task.scheduledDate);
      return task.status !== 'completed' && scheduledTime >= now && scheduledTime <= fourteenDaysFromNow;
    }).length;
  }, [maintenanceTasks]);

  const hasAttentionItems = machinesNeedingAttention.length > 0 || unacknowledgedAlerts.length > 0;

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Smart Factory Command Center</h1>
            <p className="mt-2 text-gray-400">
              Monitoring {machines.length} machines with {activeJobs.length} active jobs in progress.
            </p>
          </div>

          <div
            className={cn(
              "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
              machines.length > 0
                ? "border-green-500/30 bg-green-500/10 text-green-300"
                : "border-gray-600 bg-gray-700 text-gray-300"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                machines.length > 0 ? "bg-green-400 animate-pulse" : "bg-gray-400"
              )}
            />
            {machines.length > 0 ? 'Live telemetry' : 'Awaiting telemetry'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {machineStateSummary.map((item) => (
          <div
            key={item.status}
            className={cn("rounded-lg border bg-gray-800 p-5", item.accentClass)}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", item.dotClass)} />
                <h3 className="text-sm font-medium text-gray-300">{item.label}</h3>
              </div>
              <span className="text-xs text-gray-500">{item.description}</span>
            </div>
            <p className="text-3xl font-bold text-white">{item.count}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpis.map((kpi) => (
            <KPICard key={kpi.name} kpi={kpi} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Attention Required</h2>
              <p className="text-sm text-gray-400">Machine holds and live alerts that need operator review</p>
            </div>
            {hasAttentionItems && (
              <span className="w-fit rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm font-medium text-red-300">
                {machinesNeedingAttention.length + unacknowledgedAlerts.length} open
              </span>
            )}
          </div>

          {!hasAttentionItems ? (
            <div className="rounded-md border border-gray-700 bg-gray-900/50 p-5 text-sm text-gray-300">
              No immediate action required
            </div>
          ) : (
            <div className="space-y-6">
              {machinesNeedingAttention.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Machine State</h3>
                  <div className="divide-y divide-gray-700 rounded-md border border-gray-700">
                    {machinesNeedingAttention.map((machine) => (
                      <button
                        key={machine.id}
                        type="button"
                        onClick={() => onMachineSelect(machine.id)}
                        className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-gray-700/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-white">{machine.name}</p>
                          <p className="text-sm text-gray-400">{machine.location}</p>
                        </div>
                        <span className={cn(
                          "w-fit rounded-full border px-3 py-1 text-xs font-medium capitalize",
                          getStatusBgColor(machine.status),
                          getStatusColor(machine.status)
                        )}>
                          {machine.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {unacknowledgedAlerts.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Active Alerts</h3>
                  <div className="divide-y divide-gray-700 rounded-md border border-gray-700">
                    {unacknowledgedAlerts.map((alert) => (
                      <div key={alert.id} className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-white">{alert.machineName}</p>
                            <p className="mt-1 text-sm text-gray-400">{alert.message}</p>
                          </div>
                          <span className={cn(
                            "w-fit rounded-full border px-3 py-1 text-xs font-medium capitalize",
                            severityClass[alert.severity]
                          )}>
                            {alert.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-xl font-bold text-white">Operational Snapshot</h2>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <span className="text-sm text-gray-400">Active jobs</span>
              <span className="text-xl font-bold text-white">{activeJobs.length}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <span className="text-sm text-gray-400">Blocked jobs</span>
              <span className={cn("text-xl font-bold", blockedJobs.length > 0 ? "text-red-400" : "text-white")}>
                {blockedJobs.length}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <span className="text-sm text-gray-400">Maintenance in 14 days</span>
              <span className="text-xl font-bold text-white">{upcomingMaintenanceCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Unacknowledged alerts</span>
              <span className={cn("text-xl font-bold", unacknowledgedAlerts.length > 0 ? "text-red-400" : "text-white")}>
                {unacknowledgedAlerts.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Machine Status Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <div
              key={machine.id}
              onClick={() => onMachineSelect(machine.id)}
              className={cn(
                "bg-gray-800 rounded-lg p-6 border cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-gray-500 hover:shadow-lg",
                getStatusBgColor(machine.status)
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{machine.name}</h3>
                  <p className="text-sm text-gray-400">{machine.type}</p>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full border text-xs font-medium",
                  getStatusBgColor(machine.status),
                  getStatusColor(machine.status)
                )}>
                  <div className="flex items-center space-x-2">
                    <div className={cn("w-2 h-2 rounded-full", statusDotClass[machine.status])} />
                    <span className="capitalize">{formatLabel(machine.status)}</span>
                  </div>
                </div>
              </div>

              <p className="mb-5 text-sm text-gray-400">{machine.location}</p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-400">Efficiency</p>
                  <p className="text-lg font-bold text-white">{machine.efficiency}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Output</p>
                  <p className="text-lg font-bold text-white">{machine.output}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Cycle Time</p>
                  <p className="text-lg font-bold text-white">{machine.cycleTime}s</p>
                </div>
              </div>

              {machine.status === 'running' ? (
                <div className="space-y-2 border-t border-gray-700 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Temperature</span>
                    <span className="text-white">{machine.temperature}°C</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Power</span>
                    <span className="text-white">{machine.powerConsumption} kW</span>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-700 pt-4">
                  <p className="rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-gray-400">
                    Activity paused
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
