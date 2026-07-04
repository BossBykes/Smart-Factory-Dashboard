import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  UserIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { factoryService } from '../../services/factoryService';
import { Machine, MaintenanceTask } from '../../types/factory';
import { formatDate, formatDuration, cn } from '../../utils/helpers';

interface MaintenanceScheduleProps {
  onMachineSelect?: (machineId: string) => void;
}

type TaskStatusFilter = 'all' | MaintenanceTask['status'];
type PriorityFilter = 'all' | MaintenanceTask['priority'];
type SortOption = 'dueDate' | 'priority' | 'duration';

const priorityRank: Record<MaintenanceTask['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const dayMs = 24 * 60 * 60 * 1000;

export const MaintenanceSchedule: React.FC<MaintenanceScheduleProps> = ({ onMachineSelect }) => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('dueDate');

  useEffect(() => {
    const updateMaintenanceData = () => {
      setTasks(factoryService.getMaintenanceTasks());
      setMachines(factoryService.getAllMachines());
    };

    updateMaintenanceData();

    factoryService.addEventListener('data_update', updateMaintenanceData);
    factoryService.addEventListener('machine_update', updateMaintenanceData);

    return () => {
      factoryService.removeEventListener('data_update', updateMaintenanceData);
      factoryService.removeEventListener('machine_update', updateMaintenanceData);
    };
  }, []);

  const machinesById = useMemo(() => {
    return new Map(machines.map((machine) => [machine.id, machine]));
  }, [machines]);

  const getDaysUntilDue = useCallback((date: Date) => {
    return Math.round((startOfDay(date) - startOfDay(new Date())) / dayMs);
  }, []);

  const getEffectiveStatus = useCallback((task: MaintenanceTask): MaintenanceTask['status'] => {
    if (task.status === 'scheduled' && getDaysUntilDue(task.scheduledDate) < 0) {
      return 'overdue';
    }

    return task.status;
  }, [getDaysUntilDue]);

  const getDueLabel = useCallback((task: MaintenanceTask) => {
    const daysUntil = getDaysUntilDue(task.scheduledDate);

    if (daysUntil === 0) return 'Due today';
    if (daysUntil > 0) return `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;

    const overdueDays = Math.abs(daysUntil);
    return `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`;
  }, [getDaysUntilDue]);

  const getStatusColor = (status: MaintenanceTask['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'in-progress':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'scheduled':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'overdue':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
    }
  };

  const getPriorityColor = (priority: MaintenanceTask['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-600 text-white';
      case 'medium':
        return 'bg-yellow-600 text-black';
      case 'low':
        return 'bg-green-600 text-white';
    }
  };

  const getMachineStatusColor = (status?: Machine['status']) => {
    switch (status) {
      case 'running':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'idle':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'maintenance':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'error':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const visibleTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tasks
      .filter((task) => {
        const machine = machinesById.get(task.machineId);
        const effectiveStatus = getEffectiveStatus(task);
        const searchableText = [
          task.machineId,
          task.machineName,
          machine?.name,
          task.assignedTechnician,
          task.description
        ].filter(Boolean).join(' ').toLowerCase();

        const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
        const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((left, right) => {
        switch (sortOption) {
          case 'priority':
            return priorityRank[left.priority] - priorityRank[right.priority] ||
              left.scheduledDate.getTime() - right.scheduledDate.getTime();
          case 'duration':
            return right.estimatedDuration - left.estimatedDuration ||
              left.scheduledDate.getTime() - right.scheduledDate.getTime();
          default:
            return left.scheduledDate.getTime() - right.scheduledDate.getTime() ||
              priorityRank[left.priority] - priorityRank[right.priority];
        }
      });
  }, [getEffectiveStatus, machinesById, priorityFilter, searchTerm, sortOption, statusFilter, tasks]);

  const kpis = useMemo(() => {
    return {
      totalTasks: tasks.length,
      dueSoon: tasks.filter((task) => {
        const daysUntil = getDaysUntilDue(task.scheduledDate);
        return getEffectiveStatus(task) !== 'completed' && daysUntil >= 0 && daysUntil <= 14;
      }).length,
      highPriority: tasks.filter((task) => task.priority === 'high' || task.priority === 'critical').length,
      machinesInMaintenance: machines.filter((machine) => machine.status === 'maintenance').length
    };
  }, [getDaysUntilDue, getEffectiveStatus, machines, tasks]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Maintenance Dashboard</h1>
        <p className="text-gray-400">Live maintenance workload, machine state, and upcoming service risk</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Tasks</h3>
          <p className="text-3xl font-bold text-white">{kpis.totalTasks}</p>
        </div>

        <div className="rounded-lg border border-blue-500/30 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Due in Next 14 Days</h3>
          <p className="text-3xl font-bold text-blue-400">{kpis.dueSoon}</p>
        </div>

        <div className="rounded-lg border border-orange-500/30 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">High Priority</h3>
          <p className="text-3xl font-bold text-orange-400">{kpis.highPriority}</p>
        </div>

        <div className="rounded-lg border border-cyan-500/30 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Machines in Maintenance</h3>
          <p className="text-3xl font-bold text-cyan-400">{kpis.machinesInMaintenance}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4 lg:grid-cols-[1fr_190px_190px_190px]">
        <label className="relative block">
          <span className="sr-only">Search maintenance tasks</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by machine, ID, technician, or description"
            className="w-full rounded-md border border-gray-600 bg-gray-900 py-2 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>

        <label className="block">
          <span className="sr-only">Filter by task status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as TaskStatusFilter)}
            className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Filter by priority</span>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
            className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Sort maintenance tasks</span>
          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as SortOption)}
            className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="dueDate">Due date</option>
            <option value="priority">Priority</option>
            <option value="duration">Duration</option>
          </select>
        </label>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Maintenance Workload</h3>
            <p className="mt-1 text-sm text-gray-400">Task workflow actions are demo-only in this version.</p>
          </div>
          <p className="text-sm text-gray-400">{visibleTasks.length} of {tasks.length} tasks shown</p>
        </div>

        {visibleTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/40 p-8 text-center">
            <h4 className="text-lg font-semibold text-white">No maintenance tasks found</h4>
            <p className="mt-2 text-sm text-gray-400">Adjust the search or filters to view matching tasks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleTasks.map((task) => {
              const machine = machinesById.get(task.machineId);
              const effectiveStatus = getEffectiveStatus(task);
              const isOverdue = effectiveStatus === 'overdue';

              return (
                <article
                  key={task.id}
                  className={cn(
                    "rounded-lg border bg-gray-900/40 p-5 transition-colors hover:border-gray-500",
                    isOverdue ? "border-red-500/40" : "border-gray-700"
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-white">{machine?.name || task.machineName}</h4>
                        <span className="rounded-full border border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-300">
                          {task.machineId}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-300">{task.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <span className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", getMachineStatusColor(machine?.status))}>
                        {machine?.status || 'unknown'}
                      </span>
                      <span className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", getPriorityColor(task.priority))}>
                        {task.priority}
                      </span>
                      <span className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", getStatusColor(effectiveStatus))}>
                        {effectiveStatus.replace('-', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className={cn("h-5 w-5", isOverdue ? "text-red-400" : "text-gray-400")} />
                      <div>
                        <p className="text-gray-400">Scheduled</p>
                        <p className="font-medium text-white">{formatDate(task.scheduledDate)}</p>
                        <p className={cn("text-xs", isOverdue ? "text-red-300" : "text-gray-500")}>{getDueLabel(task)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-gray-400">Duration</p>
                        <p className="font-medium text-white">{formatDuration(task.estimatedDuration * 60)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-gray-400">Technician</p>
                        <p className="font-medium text-white">{task.assignedTechnician || 'Unassigned'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-gray-400">Location</p>
                        <p className="font-medium text-white">{machine?.location || 'Unknown location'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 border-t border-gray-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <WrenchScrewdriverIcon className="h-4 w-4" />
                      <span className="capitalize">{task.type} maintenance</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onMachineSelect?.(task.machineId)}
                      disabled={!onMachineSelect}
                      className={cn(
                        "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                        onMachineSelect
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "cursor-not-allowed bg-gray-700 text-gray-500"
                      )}
                    >
                      View machine
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
