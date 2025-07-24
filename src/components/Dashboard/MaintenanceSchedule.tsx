import React, { useState, useEffect } from 'react';
import { WrenchScrewdriverIcon, CalendarIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import { factoryService } from '../../services/factoryService';
import { MaintenanceTask } from '../../types/factory';
import { formatDate, formatDuration, cn } from '../../utils/helpers';

export const MaintenanceSchedule: React.FC = () => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);

  useEffect(() => {
    const updateTasks = () => {
      setTasks(factoryService.getMaintenanceTasks());
    };

    updateTasks();
    const interval = setInterval(updateTasks, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'in-progress':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'scheduled':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'overdue':
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'preventive':
        return '🔧';
      case 'predictive':
        return '📊';
      case 'corrective':
        return '🚨';
      default:
        return '⚙️';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Maintenance Schedule</h1>
        <p className="text-gray-400">Predictive maintenance calendar and task management</p>
      </div>

      {/* Maintenance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Tasks</h3>
          <p className="text-3xl font-bold text-white">{tasks.length}</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-blue-500/30">
          <h3 className="text-sm font-medium text-gray-400 mb-2">In Progress</h3>
          <p className="text-3xl font-bold text-blue-400">
            {tasks.filter(t => t.status === 'in-progress').length}
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-yellow-500/30">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Scheduled</h3>
          <p className="text-3xl font-bold text-yellow-400">
            {tasks.filter(t => t.status === 'scheduled').length}
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-red-500/30">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Overdue</h3>
          <p className="text-3xl font-bold text-red-400">
            {tasks.filter(t => t.status === 'overdue').length}
          </p>
        </div>
      </div>

      {/* Maintenance Calendar/Timeline */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-6">Upcoming Maintenance</h3>
        <div className="space-y-4">
          {tasks
            .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
            .map((task) => (
              <div key={task.id} className={cn("border rounded-lg p-4 transition-all duration-200", getStatusColor(task.status))}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">{getTypeIcon(task.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-white">{task.machineName}</h4>
                        <span className={cn("px-2 py-1 rounded text-xs font-medium", getPriorityColor(task.priority))}>
                          {task.priority}
                        </span>
                        <span className="px-2 py-1 bg-gray-700 rounded text-xs font-medium text-gray-300 capitalize">
                          {task.type}
                        </span>
                      </div>
                      
                      <p className="text-gray-300 mb-3">{task.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-gray-400">Scheduled</p>
                            <p className="text-white">{formatDate(task.scheduledDate)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-gray-400">Duration</p>
                            <p className="text-white">{formatDuration(task.estimatedDuration * 60)}</p>
                          </div>
                        </div>
                        
                        {task.assignedTechnician && (
                          <div className="flex items-center space-x-2">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-gray-400">Technician</p>
                              <p className="text-white">{task.assignedTechnician}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className={cn("px-3 py-1 rounded-full text-xs font-medium border", getStatusColor(task.status))}>
                    {task.status.replace('-', ' ')}
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end space-x-2">
                  {task.status === 'scheduled' && (
                    <>
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                        Start Task
                      </button>
                      <button className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors">
                        Reschedule
                      </button>
                    </>
                  )}
                  
                  {task.status === 'in-progress' && (
                    <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors">
                      Mark Complete
                    </button>
                  )}
                  
                  {task.status === 'overdue' && (
                    <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors">
                      Urgent Action
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Schedule New Maintenance */}
      <div className="flex justify-end">
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Schedule Maintenance
        </button>
      </div>
    </div>
  );
};