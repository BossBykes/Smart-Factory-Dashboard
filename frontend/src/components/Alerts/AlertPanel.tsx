import React, { useState, useEffect } from 'react';
import { BellIcon, ExclamationTriangleIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { factoryService } from '../../services/factoryService';
import { Alert } from '../../types/factory';
import { formatDate, cn } from '../../utils/helpers';

export const AlertPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical'>('all');

  useEffect(() => {
    const updateAlerts = () => {
      setAlerts(factoryService.getAlerts());
    };

    updateAlerts();
    const interval = setInterval(updateAlerts, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = (alertId: string) => {
    factoryService.acknowledgeAlert(alertId);
    setAlerts(factoryService.getAlerts());
  };

  const filteredAlerts = alerts.filter(alert => {
    switch (filter) {
      case 'unacknowledged':
        return !alert.acknowledged;
      case 'critical':
        return alert.severity === 'critical' || alert.severity === 'high';
      default:
        return true;
    }
  });

  const getSeverityIcon = (type: string, severity: string) => {
    if (type === 'error' || severity === 'critical') {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
    }
    return <BellIcon className="h-5 w-5 text-yellow-400" />;
  };

  const getSeverityColor = (severity: string, acknowledged: boolean) => {
    if (acknowledged) {
      return 'border-gray-600 bg-gray-800/50';
    }
    
    switch (severity) {
      case 'critical':
        return 'border-red-500/50 bg-red-500/10';
      case 'high':
        return 'border-orange-500/50 bg-orange-500/10';
      case 'medium':
        return 'border-yellow-500/50 bg-yellow-500/10';
      default:
        return 'border-blue-500/50 bg-blue-500/10';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-black';
      case 'maintenance':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Alert Center</h1>
          <p className="text-gray-400">Monitor and manage factory alerts and notifications</p>
        </div>
        
        <div className="flex space-x-2">
          {['all', 'unacknowledged', 'critical'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType as typeof filter)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize",
                filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              )}
            >
              {filterType}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Alerts</h3>
          <p className="text-3xl font-bold text-white">{alerts.length}</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-red-500/30">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Critical</h3>
          <p className="text-3xl font-bold text-red-400">
            {alerts.filter(a => a.severity === 'critical').length}
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-yellow-500/30">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Unacknowledged</h3>
          <p className="text-3xl font-bold text-yellow-400">
            {alerts.filter(a => !a.acknowledged).length}
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-green-500/30">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Resolved Today</h3>
          <p className="text-3xl font-bold text-green-400">
            {alerts.filter(a => a.acknowledged).length}
          </p>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No alerts found</h3>
            <p className="text-gray-400">
              {filter === 'all' ? 'All systems are operating normally.' : `No ${filter} alerts at this time.`}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "bg-gray-800 rounded-lg p-6 border transition-all duration-200",
                getSeverityColor(alert.severity, alert.acknowledged)
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getSeverityIcon(alert.type, alert.severity)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{alert.machineName}</h3>
                      <span className={cn("px-2 py-1 rounded text-xs font-medium", getTypeColor(alert.type))}>
                        {alert.type}
                      </span>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        alert.severity === 'critical' ? 'bg-red-600 text-white' :
                        alert.severity === 'high' ? 'bg-orange-600 text-white' :
                        alert.severity === 'medium' ? 'bg-yellow-600 text-black' :
                        'bg-gray-600 text-white'
                      )}>
                        {alert.severity}
                      </span>
                    </div>
                    
                    <p className="text-gray-300 mb-3">{alert.message}</p>
                    
                    <div className="flex items-center text-sm text-gray-400">
                      <span>Machine ID: {alert.machineId}</span>
                      <span className="mx-2">•</span>
                      <span>{formatDate(alert.timestamp)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {alert.acknowledged ? (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckIcon className="h-5 w-5" />
                      <span className="text-sm">Acknowledged</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};