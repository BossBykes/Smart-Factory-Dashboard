import React, { useState, useEffect } from 'react';
import { factoryService } from '../../services/factoryService';
import { Machine, KPI } from '../../types/factory';
import { getStatusColor, getStatusBgColor, cn } from '../../utils/helpers';
import { KPICard } from './KPICard';

interface FactoryOverviewProps {
  onMachineSelect: (machineId: string) => void;
}

export const FactoryOverview: React.FC<FactoryOverviewProps> = ({ onMachineSelect }) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [kpis, setKPIs] = useState<KPI[]>([]);

  useEffect(() => {
    const updateData = () => {
      setMachines(factoryService.getAllMachines());
      setKPIs(factoryService.getKPIs());
    };

    updateData();
    const handleDataUpdate = () => updateData();
    const handleMachineUpdate = () => updateData();

    factoryService.addEventListener('data_update', handleDataUpdate);
    factoryService.addEventListener('machine_update', handleMachineUpdate);

    return () => {
      factoryService.removeEventListener('data_update', handleDataUpdate);
      factoryService.removeEventListener('machine_update', handleMachineUpdate);
    };
  }, []);

  const getMachineTypeIcon = (type: string) => {
    switch (type) {
      case 'CNC':
        return '';
      case 'Assembly':
        return '';
      case 'Quality Check':
        return '';
      case 'Packaging':
        return '';
      case '3D Printer':
        return '';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-8">
      {/* KPI Section */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpis.map((kpi) => (
            <KPICard key={kpi.name} kpi={kpi} />
          ))}
        </div>
      </div>

      {/* Machine Status Grid */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Machine Status Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <div
              key={machine.id}
              onClick={() => onMachineSelect(machine.id)}
              className={cn(
                "bg-gray-800 rounded-lg p-6 border cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg",
                getStatusBgColor(machine.status)
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getMachineTypeIcon(machine.type)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{machine.name}</h3>
                    <p className="text-sm text-gray-400">{machine.type}</p>
                  </div>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-xs font-medium", getStatusColor(machine.status))}>
                  <div className="flex items-center space-x-2">
                    <div className={cn("w-2 h-2 rounded-full", machine.status === 'running' ? 'bg-green-400 animate-pulse' : machine.status === 'error' ? 'bg-red-400 animate-pulse' : 'bg-gray-400')} />
                    <span className="capitalize">{machine.status}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400">Efficiency</p>
                  <p className="text-lg font-bold text-white">{machine.efficiency}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Output</p>
                  <p className="text-lg font-bold text-white">{machine.output}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Temperature</span>
                  <span className="text-white">{machine.temperature}°C</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Power</span>
                  <span className="text-white">{machine.powerConsumption}kW</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Location</span>
                  <span className="text-white">{machine.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
