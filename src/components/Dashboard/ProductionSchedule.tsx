import React, { useState, useEffect } from 'react';
import { CalendarDaysIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { factoryService } from '../../services/factoryService';
import { ProductionJob } from '../../types/factory';
import { formatDate, cn } from '../../utils/helpers';

export const ProductionSchedule: React.FC = () => {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);

  useEffect(() => {
    const updateJobs = () => {
      setJobs(factoryService.getProductionJobs());
    };

    updateJobs();
    const interval = setInterval(updateJobs, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'in-progress':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'cancelled':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-600 text-white';
      case 'medium':
        return 'bg-yellow-600 text-black';
      case 'low':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? (completed / total) * 100 : 0;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Production Schedule</h1>
        <p className="text-gray-400">Plan and track manufacturing jobs across the factory floor</p>
      </div>

      {/* Schedule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Jobs</h3>
          <p className="text-3xl font-bold text-white">{jobs.length}</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-blue-500/30">
          <h3 className="text-sm font-medium text-gray-400 mb-2">In Progress</h3>
          <p className="text-3xl font-bold text-blue-400">
            {jobs.filter(j => j.status === 'in-progress').length}
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-green-500/30">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Completed</h3>
          <p className="text-3xl font-bold text-green-400">
            {jobs.filter(j => j.status === 'completed').length}
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-yellow-500/30">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Pending</h3>
          <p className="text-3xl font-bold text-yellow-400">
            {jobs.filter(j => j.status === 'pending').length}
          </p>
        </div>
      </div>

      {/* Job Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">{job.productName}</h3>
                <p className="text-gray-400">Job ID: {job.id}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={cn("px-2 py-1 rounded text-xs font-medium", getPriorityColor(job.priority))}>
                  {job.priority}
                </span>
                <span className={cn("px-3 py-1 rounded-full text-xs font-medium border", getStatusColor(job.status))}>
                  {job.status.replace('-', ' ')}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Progress</span>
                <span>{job.completed}/{job.quantity} units ({Math.round(getProgressPercentage(job.completed, job.quantity))}%)</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className={cn(
                    "h-3 rounded-full transition-all duration-500",
                    job.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${getProgressPercentage(job.completed, job.quantity)}%` }}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2 text-sm">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-400">Start Time</p>
                  <p className="text-white">{formatDate(job.startTime)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-400">Est. Completion</p>
                  <p className="text-white">{formatDate(job.estimatedEndTime)}</p>
                </div>
              </div>
            </div>

            {/* Assigned Machines */}
            <div>
              <p className="text-sm text-gray-400 mb-2">Assigned Machines</p>
              <div className="flex flex-wrap gap-2">
                {job.assignedMachines.map((machineId) => (
                  <span
                    key={machineId}
                    className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
                  >
                    {machineId}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Job Button */}
      <div className="flex justify-end">
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Schedule New Job
        </button>
      </div>
    </div>
  );
};