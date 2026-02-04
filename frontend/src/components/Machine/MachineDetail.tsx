import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { factoryService } from '../../services/factoryService';
import { Machine } from '../../types/factory';
import { getStatusColor, getStatusBgColor, formatDate, cn } from '../../utils/helpers';

interface MachineDetailProps {
  machineId: string;
  onBack: () => void;
}

export const MachineDetail: React.FC<MachineDetailProps> = ({ machineId, onBack }) => {
  const [machine, setMachine] = useState<Machine | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    const appendHistoricalData = (foundMachine: Machine) => {
      setHistoricalData(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString(),
          efficiency: foundMachine.efficiency,
          temperature: foundMachine.temperature,
          vibration: foundMachine.vibration,
          power: foundMachine.powerConsumption
        };
        
        const updated = [...prev, newEntry];
        return updated.slice(-20); // Keep last 20 entries
      });
    };

    const updateMachine = () => {
      const foundMachine = factoryService.getMachine(machineId);
      if (foundMachine) {
        setMachine(foundMachine);
        appendHistoricalData(foundMachine);
      }
    };

    const handleDataUpdate = () => updateMachine();
    const handleMachineUpdate = (updatedMachine: Machine) => {
      if (updatedMachine.id === machineId) {
        setMachine(updatedMachine);
        appendHistoricalData(updatedMachine);
      }
    };

    updateMachine();
    factoryService.addEventListener('data_update', handleDataUpdate);
    factoryService.addEventListener('machine_update', handleMachineUpdate);

    return () => {
      factoryService.removeEventListener('data_update', handleDataUpdate);
      factoryService.removeEventListener('machine_update', handleMachineUpdate);
    };
  }, [machineId]);

  if (!machine) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Machine not found</div>
      </div>
    );
  }

  const getMachineTypeIcon = (type: string) => {
    switch (type) {
      case 'CNC': return '⚙️';
      case 'Assembly': return '🔧';
      case 'Quality Check': return '🔍';
      case 'Packaging': return '📦';
      case '3D Printer': return '🖨️';
      default: return '⚡';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-3xl font-bold text-white">Machine Details</h1>
      </div>

      {/* Machine Header */}
      <div className={cn("bg-gray-800 rounded-lg p-6 border", getStatusBgColor(machine.status))}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-4xl">{getMachineTypeIcon(machine.type)}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{machine.name}</h2>
              <p className="text-gray-400">{machine.type} • {machine.location}</p>
            </div>
          </div>
          <div className={cn("px-4 py-2 rounded-full font-medium", getStatusColor(machine.status))}>
            <div className="flex items-center space-x-2">
              <div className={cn("w-3 h-3 rounded-full", machine.status === 'running' ? 'bg-green-400 animate-pulse' : machine.status === 'error' ? 'bg-red-400 animate-pulse' : 'bg-gray-400')} />
              <span className="capitalize">{machine.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Efficiency</h3>
          <p className="text-3xl font-bold text-white">{machine.efficiency}%</p>
          <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${machine.efficiency}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Temperature</h3>
          <p className="text-3xl font-bold text-white">{machine.temperature}°C</p>
          <p className="text-sm text-gray-400 mt-2">
            {machine.temperature > 75 ? 'High' : machine.temperature > 65 ? 'Normal' : 'Low'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Vibration</h3>
          <p className="text-3xl font-bold text-white">{machine.vibration}</p>
          <p className="text-sm text-gray-400 mt-2">
            {machine.vibration > 3 ? 'High' : machine.vibration > 1.5 ? 'Normal' : 'Low'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Power</h3>
          <p className="text-3xl font-bold text-white">{machine.powerConsumption}kW</p>
          <p className="text-sm text-gray-400 mt-2">Current draw</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Efficiency Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Line type="monotone" dataKey="efficiency" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Temperature & Vibration</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Line type="monotone" dataKey="temperature" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="vibration" stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Maintenance Schedule</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Last Maintenance</span>
              <span className="text-white">{formatDate(machine.lastMaintenance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Next Maintenance</span>
              <span className="text-white">{formatDate(machine.nextMaintenance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cycle Time</span>
              <span className="text-white">{machine.cycleTime}s</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Production Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Today's Output</span>
              <span className="text-white">{machine.output} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Target Output</span>
              <span className="text-white">300 units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Progress</span>
              <span className="text-white">{Math.round((machine.output / 300) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
