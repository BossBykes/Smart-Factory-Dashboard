import React, { useEffect, useState } from 'react';
import {
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { factoryService } from '../../services/factoryService';
import { Alert } from '../../types/factory';
import { formatDate, cn } from '../../utils/helpers';

interface AlertPanelProps {
  onViewMachine: (machineId: string) => void;
}

type AlertFilter = 'all' | 'unacknowledged' | 'critical' | 'resolved';

interface AlertChip {
  label: string;
  severity: Alert['severity'];
}

interface AlertGroup {
  machineId: string;
  machineName: string;
  alerts: Alert[];
  activeAlerts: Alert[];
  unacknowledgedActive: Alert[];
  resolvedTodayCount: number;
  hasResolvedAlerts: boolean;
  hasCriticalActive: boolean;
  chips: AlertChip[];
  latestAlert?: Alert;
}

const FILTERS: AlertFilter[] = ['all', 'unacknowledged', 'critical', 'resolved'];

const SEVERITY_RANK: Record<Alert['severity'], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export const AlertPanel: React.FC<AlertPanelProps> = ({ onViewMachine }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const updateAlerts = () => {
      setAlerts([...factoryService.getAlerts()]);
    };

    updateAlerts();
    const handleDataUpdate = () => updateAlerts();
    const handleAlertsUpdate = () => updateAlerts();

    factoryService.addEventListener('data_update', handleDataUpdate);
    factoryService.addEventListener('alerts_update', handleAlertsUpdate);

    return () => {
      factoryService.removeEventListener('data_update', handleDataUpdate);
      factoryService.removeEventListener('alerts_update', handleAlertsUpdate);
    };
  }, []);

  const handleAcknowledge = (alertId: string) => {
    factoryService.acknowledgeAlert(alertId);
    setAlerts([...factoryService.getAlerts()]);
  };

  const handleAcknowledgeAll = (machineId: string) => {
    factoryService.acknowledgeAlertsForMachine(machineId);
    setAlerts([...factoryService.getAlerts()]);
  };

  const toggleGroup = (machineId: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [machineId]: !current[machineId],
    }));
  };

  const isToday = (date?: Date) => {
    if (!date) return false;
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const isAlertResolved = (alert: Alert) => alert.status === 'resolved';

  const resolvedTodayCount = alerts.filter(
    (alert) => isAlertResolved(alert) && isToday(alert.resolvedAt ?? undefined)
  ).length;

  const alertGroups: AlertGroup[] = Object.values(
    alerts.reduce<Record<string, { machineId: string; machineName: string; alerts: Alert[] }>>(
      (groups, alert) => {
        if (!groups[alert.machineId]) {
          groups[alert.machineId] = {
            machineId: alert.machineId,
            machineName: alert.machineName,
            alerts: [],
          };
        }

        groups[alert.machineId].alerts.push(alert);
        return groups;
      },
      {}
    )
  )
    .map((group) => {
      const machineAlerts = [...group.alerts].sort(
        (left, right) => right.timestamp.getTime() - left.timestamp.getTime()
      );
      const activeAlerts = machineAlerts.filter((alert) => !isAlertResolved(alert));
      const unacknowledgedActive = activeAlerts.filter((alert) => !alert.acknowledged);
      const hasResolvedAlerts = machineAlerts.some((alert) => isAlertResolved(alert));
      const resolvedTodayCountForMachine = machineAlerts.filter(
        (alert) => isAlertResolved(alert) && isToday(alert.resolvedAt ?? undefined)
      ).length;
      const chipMap: Record<string, AlertChip> = {};

      activeAlerts.forEach((alert) => {
        const label = alert.ruleKey || alert.type;
        const existingChip = chipMap[label];

        if (!existingChip || SEVERITY_RANK[alert.severity] > SEVERITY_RANK[existingChip.severity]) {
          chipMap[label] = {
            label,
            severity: alert.severity,
          };
        }
      });

      const chips = Object.values(chipMap).sort((left, right) => {
        return (
          SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity] ||
          left.label.localeCompare(right.label)
        );
      });

      return {
        machineId: group.machineId,
        machineName: group.machineName,
        alerts: machineAlerts,
        activeAlerts,
        unacknowledgedActive,
        resolvedTodayCount: resolvedTodayCountForMachine,
        hasResolvedAlerts,
        hasCriticalActive: activeAlerts.some(
          (alert) => alert.severity === 'high' || alert.severity === 'critical'
        ),
        chips,
        latestAlert: machineAlerts[0],
      };
    })
    .sort((left, right) => {
      return (
        (right.latestAlert?.timestamp.getTime() ?? 0) - (left.latestAlert?.timestamp.getTime() ?? 0)
      );
    });

  const filteredGroups = alertGroups.filter((group) => {
    switch (filter) {
      case 'unacknowledged':
        return group.unacknowledgedActive.length > 0;
      case 'critical':
        return group.hasCriticalActive;
      case 'resolved':
        return group.hasResolvedAlerts || group.resolvedTodayCount > 0;
      default:
        return true;
    }
  });

  const getSeverityIcon = (type: Alert['type'], severity: Alert['severity']) => {
    if (type === 'error' || severity === 'critical') {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
    }
    return <BellIcon className="h-5 w-5 text-yellow-400" />;
  };

  const getSeverityColor = (severity: Alert['severity'], acknowledged: boolean) => {
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

  const getAlertCardStyle = (alert: Alert) => {
    if (alert.status === 'resolved') {
      return 'border-emerald-500/30 bg-emerald-500/10';
    }
    return getSeverityColor(alert.severity, alert.acknowledged);
  };

  const getTypeColor = (type: Alert['type']) => {
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

  const getSeverityBadgeColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-600 text-white';
      case 'medium':
        return 'bg-yellow-600 text-black';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getChipColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500/30 bg-red-500/10 text-red-200';
      case 'high':
        return 'border-orange-500/30 bg-orange-500/10 text-orange-200';
      case 'medium':
        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100';
      default:
        return 'border-blue-500/30 bg-blue-500/10 text-blue-100';
    }
  };

  const getGroupCardStyle = (group: AlertGroup) => {
    if (group.activeAlerts.length === 0 && group.hasResolvedAlerts) {
      return 'border-emerald-500/30';
    }

    const highestActiveSeverity = group.activeAlerts.reduce<Alert['severity'] | null>(
      (highest, alert) => {
        if (!highest || SEVERITY_RANK[alert.severity] > SEVERITY_RANK[highest]) {
          return alert.severity;
        }

        return highest;
      },
      null
    );

    switch (highestActiveSeverity) {
      case 'critical':
        return 'border-red-500/40';
      case 'high':
        return 'border-orange-500/40';
      case 'medium':
        return 'border-yellow-500/40';
      case 'low':
        return 'border-blue-500/40';
      default:
        return 'border-gray-700';
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
          {FILTERS.map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
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
            {resolvedTodayCount}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No machine groups found</h3>
            <p className="text-gray-400">
              {filter === 'all'
                ? 'All systems are operating normally.'
                : `No ${filter} machine groups at this time.`}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isExpanded = !!expandedGroups[group.machineId];

            return (
            <div
              key={group.machineId}
              className={cn(
                "bg-gray-800 rounded-lg p-6 border transition-all duration-200",
                getGroupCardStyle(group)
              )}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{group.machineName}</h3>
                      <span className="rounded-full border border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-300">
                        {group.machineId}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">
                      {group.alerts.length} total alert{group.alerts.length === 1 ? '' : 's'}
                      {group.latestAlert ? ` • Latest ${formatDate(group.latestAlert.timestamp)}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-gray-200">
                      Active <span className="ml-1 text-white">{group.activeAlerts.length}</span>
                    </span>
                    <span className="rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-gray-200">
                      Unacknowledged <span className="ml-1 text-white">{group.unacknowledgedActive.length}</span>
                    </span>
                    <span className="rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-gray-200">
                      Resolved Today <span className="ml-1 text-white">{group.resolvedTodayCount}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <button
                    onClick={() => onViewMachine(group.machineId)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    View machine
                  </button>
                  {group.unacknowledgedActive.length > 0 && (
                    <button
                      onClick={() => handleAcknowledgeAll(group.machineId)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Acknowledge all
                    </button>
                  )}
                  <button
                    onClick={() => toggleGroup(group.machineId)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    {isExpanded ? 'Collapse' : 'Expand'}
                    {isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-700 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {group.chips.length > 0 ? (
                    group.chips.map((chip) => (
                      <span
                        key={chip.label}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          getChipColor(chip.severity)
                        )}
                      >
                        {chip.label}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-gray-600 px-3 py-1 text-xs font-medium text-gray-400">
                      No active rules
                    </span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-3">
                  {group.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "rounded-lg border p-4 transition-all duration-200",
                        getAlertCardStyle(alert)
                      )}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="mt-1 flex-shrink-0">
                            {getSeverityIcon(alert.type, alert.severity)}
                          </div>

                          <div className="space-y-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={cn("px-2 py-1 rounded text-xs font-medium", getTypeColor(alert.type))}>
                                  {alert.ruleKey || alert.type}
                                </span>
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded text-xs font-medium",
                                    getSeverityBadgeColor(alert.severity)
                                  )}
                                >
                                  {alert.severity}
                                </span>
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded text-xs font-medium",
                                    isAlertResolved(alert)
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-red-500/20 text-red-100'
                                  )}
                                >
                                  {isAlertResolved(alert) ? 'Resolved' : 'Active'}
                                </span>
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded text-xs font-medium",
                                    alert.acknowledged
                                      ? 'bg-green-500/20 text-green-100'
                                      : 'bg-yellow-500/20 text-yellow-100'
                                  )}
                                >
                                  {alert.acknowledged ? 'Acknowledged' : 'Unacknowledged'}
                                </span>
                              </div>

                              <p className="text-gray-100">{alert.message}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
                              <span>{formatDate(alert.timestamp)}</span>
                              {isAlertResolved(alert) && alert.resolvedAt && (
                                <span>Resolved {formatDate(alert.resolvedAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {!alert.acknowledged && !isAlertResolved(alert) ? (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <CheckIcon className="h-4 w-4 text-green-400" />
                            <span>
                              {isAlertResolved(alert) ? 'No action needed' : 'Already acknowledged'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};
