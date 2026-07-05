import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { factoryService } from '../../services/factoryService';
import { Machine, ProductionJob } from '../../types/factory';
import { formatDate, cn } from '../../utils/helpers';

interface ProductionScheduleProps {
  onMachineSelect?: (machineId: string) => void;
}

type StatusFilter = 'all' | ProductionJob['status'];
type PriorityFilter = 'all' | ProductionJob['priority'];
type SortOption = 'priority' | 'progress' | 'endTime';
type JobHealth = 'blocked' | 'waiting' | 'on-track' | 'unassigned';

const priorityRank: Record<ProductionJob['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

export const ProductionSchedule: React.FC<ProductionScheduleProps> = ({ onMachineSelect }) => {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('priority');

  useEffect(() => {
    const updateProductionData = () => {
      setJobs(factoryService.getProductionJobs());
      setMachines(factoryService.getAllMachines());
    };

    updateProductionData();

    factoryService.addEventListener('data_update', updateProductionData);
    factoryService.addEventListener('machine_update', updateProductionData);

    return () => {
      factoryService.removeEventListener('data_update', updateProductionData);
      factoryService.removeEventListener('machine_update', updateProductionData);
    };
  }, []);

  const machinesById = useMemo(() => {
    return new Map(machines.map((machine) => [machine.id, machine]));
  }, [machines]);

  const getProgressPercentage = useCallback((job: ProductionJob) => {
    return job.quantity > 0 ? Math.min(100, Math.round((job.completed / job.quantity) * 100)) : 0;
  }, []);

  const getAssignedMachines = useCallback((job: ProductionJob) => {
    return job.assignedMachines
      .map((machineId) => machinesById.get(machineId))
      .filter((machine): machine is Machine => Boolean(machine));
  }, [machinesById]);

  const getJobHealth = useCallback((job: ProductionJob): JobHealth => {
    const assignedMachines = getAssignedMachines(job);

    if (assignedMachines.length === 0) return 'unassigned';
    if (assignedMachines.some((machine) => machine.status === 'error' || machine.status === 'maintenance')) return 'blocked';
    if (assignedMachines.every((machine) => machine.status === 'idle')) return 'waiting';
    return 'on-track';
  }, [getAssignedMachines]);

  const getStatusColor = (status: ProductionJob['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'in-progress':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'cancelled':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
    }
  };

  const getPriorityColor = (priority: ProductionJob['priority']) => {
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

  const getHealthColor = (health: JobHealth) => {
    switch (health) {
      case 'blocked':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'waiting':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'on-track':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'unassigned':
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getHealthLabel = (health: JobHealth) => {
    return health === 'on-track' ? 'on track' : health;
  };

  const visibleJobs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return jobs
      .filter((job) => {
        const machineNames = job.assignedMachines.map((machineId) => machinesById.get(machineId)?.name);
        const searchableText = [
          job.id,
          job.productName,
          ...job.assignedMachines,
          ...machineNames
        ].filter(Boolean).join(' ').toLowerCase();

        const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
        const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || job.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((left, right) => {
        switch (sortOption) {
          case 'progress':
            return getProgressPercentage(left) - getProgressPercentage(right) ||
              left.estimatedEndTime.getTime() - right.estimatedEndTime.getTime();
          case 'endTime':
            return left.estimatedEndTime.getTime() - right.estimatedEndTime.getTime() ||
              priorityRank[left.priority] - priorityRank[right.priority];
          default:
            return priorityRank[left.priority] - priorityRank[right.priority] ||
              left.estimatedEndTime.getTime() - right.estimatedEndTime.getTime();
        }
      });
  }, [getProgressPercentage, jobs, machinesById, priorityFilter, searchTerm, sortOption, statusFilter]);

  const kpis = useMemo(() => {
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((job) => job.status !== 'completed' && job.status !== 'cancelled').length,
      blockedJobs: jobs.filter((job) => getJobHealth(job) === 'blocked').length,
      unitsRemaining: jobs.reduce((total, job) => total + Math.max(0, job.quantity - job.completed), 0)
    };
  }, [getJobHealth, jobs]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Production Board</h1>
        <p className="text-gray-400">Live job progress, machine availability, and production risk</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Jobs</h3>
          <p className="text-3xl font-bold text-white">{kpis.totalJobs}</p>
        </div>

        <div className="rounded-lg border border-blue-500/30 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Active Jobs</h3>
          <p className="text-3xl font-bold text-blue-400">{kpis.activeJobs}</p>
        </div>

        <div className="rounded-lg border border-red-500/30 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Blocked Jobs</h3>
          <p className="text-3xl font-bold text-red-400">{kpis.blockedJobs}</p>
        </div>

        <div className="rounded-lg border border-green-500/30 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Units Remaining</h3>
          <p className="text-3xl font-bold text-green-400">{kpis.unitsRemaining}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4 lg:grid-cols-[1fr_190px_190px_190px]">
        <label className="relative block">
          <span className="sr-only">Search production jobs</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by job, product, machine ID, or machine name"
            className="w-full rounded-md border border-gray-600 bg-gray-900 py-2 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>

        <label className="block">
          <span className="sr-only">Filter by job status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Filter by job priority</span>
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
          <span className="sr-only">Sort production jobs</span>
          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as SortOption)}
            className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="priority">Priority</option>
            <option value="progress">Progress</option>
            <option value="endTime">End time</option>
          </select>
        </label>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Job Queue</h3>
            <p className="mt-1 text-sm text-gray-400">Job creation actions are demo-only in this version.</p>
          </div>
          <p className="text-sm text-gray-400">{visibleJobs.length} of {jobs.length} jobs shown</p>
        </div>

        {visibleJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/40 p-8 text-center">
            <h4 className="text-lg font-semibold text-white">No production jobs found</h4>
            <p className="mt-2 text-sm text-gray-400">Adjust the search or filters to view matching jobs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleJobs.map((job) => {
              const progress = getProgressPercentage(job);
              const remaining = Math.max(0, job.quantity - job.completed);
              const health = getJobHealth(job);
              const blockedMachines = getAssignedMachines(job).filter(
                (machine) => machine.status === 'error' || machine.status === 'maintenance'
              );

              return (
                <article
                  key={job.id}
                  className={cn(
                    "rounded-lg border bg-gray-900/40 p-5 transition-colors hover:border-gray-500",
                    health === 'blocked' ? "border-red-500/40" : "border-gray-700"
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-white">{job.productName}</h4>
                      <p className="mt-1 text-sm text-gray-400">Job ID: {job.id}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", getPriorityColor(job.priority))}>
                        {job.priority}
                      </span>
                      <span className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", getStatusColor(job.status))}>
                        {job.status.replace('-', ' ')}
                      </span>
                      <span className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", getHealthColor(health))}>
                        {getHealthLabel(health)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-sm text-gray-400">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-700">
                      <div
                        className={cn(
                          "h-3 rounded-full transition-all duration-500",
                          health === 'blocked' ? "bg-red-500" :
                          job.status === 'completed' ? "bg-green-500" :
                          "bg-blue-500"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-gray-400">Quantity</p>
                      <p className="font-medium text-white">
                        {job.completed}/{job.quantity} complete
                      </p>
                      <p className="text-xs text-gray-500">{remaining} remaining</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-gray-400">Start Time</p>
                        <p className="font-medium text-white">{formatDate(job.startTime)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-gray-400">Estimated End</p>
                        <p className="font-medium text-white">{formatDate(job.estimatedEndTime)}</p>
                      </div>
                    </div>
                  </div>

                  {health === 'blocked' && (
                    <div className="mt-5 flex items-start space-x-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                      <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
                      <p>
                        Blocked by {blockedMachines.map((machine) => `${machine.name} (${machine.status})`).join(', ')}.
                      </p>
                    </div>
                  )}

                  <div className="mt-5 border-t border-gray-700 pt-4">
                    <p className="mb-3 text-sm text-gray-400">Assigned Machines</p>
                    <div className="flex flex-wrap gap-2">
                      {job.assignedMachines.map((machineId) => {
                        const machine = machinesById.get(machineId);

                        return (
                          <button
                            key={machineId}
                            type="button"
                            onClick={() => onMachineSelect?.(machineId)}
                            disabled={!onMachineSelect}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors",
                              getMachineStatusColor(machine?.status),
                              onMachineSelect ? "hover:border-gray-400" : "cursor-not-allowed opacity-70"
                            )}
                          >
                            <span className="block text-white">{machine?.name || machineId}</span>
                            <span className="capitalize">{machine?.status || 'unknown'}</span>
                          </button>
                        );
                      })}
                    </div>
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
