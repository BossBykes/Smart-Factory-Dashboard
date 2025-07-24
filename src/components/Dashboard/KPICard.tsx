import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';
import { KPI } from '../../types/factory';

interface KPICardProps {
  kpi: KPI;
}

export const KPICard: React.FC<KPICardProps> = ({ kpi }) => {
  const getTrendIcon = () => {
    switch (kpi.trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-5 w-5 text-green-400" />;
      case 'down':
        return <ArrowTrendingDownIcon className="h-5 w-5 text-red-400" />;
      default:
        return <MinusIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    switch (kpi.trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getProgressColor = () => {
    if (!kpi.target) return 'bg-blue-500';
    const percentage = (kpi.value / kpi.target) * 100;
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{kpi.name}</h3>
        {getTrendIcon()}
      </div>
      
      <div className="flex items-baseline space-x-2 mb-2">
        <span className="text-3xl font-bold text-white">{kpi.value}</span>
        <span className="text-lg text-gray-400">{kpi.unit}</span>
      </div>

      {kpi.target && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>Target: {kpi.target}{kpi.unit}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className={`flex items-center text-sm ${getTrendColor()}`}>
        <span className="capitalize">{kpi.trend}</span>
        {kpi.trend !== 'stable' && <span className="ml-1">trend</span>}
      </div>
    </div>
  );
};