import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { factoryService } from '../../services/factoryService';
import { Machine, ProductionJob } from '../../types/factory';

const EmptyState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-gray-700 bg-gray-900/40 text-center">
    <div>
      <p className="text-base font-medium text-gray-300">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
    </div>
  </div>
);

export const ProductionMetrics: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [jobs, setJobs] = useState<ProductionJob[]>([]);

  useEffect(() => {
    const updateData = () => {
      setMachines(factoryService.getAllMachines());
      setJobs(factoryService.getProductionJobs());
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

  const machinesById = useMemo(() => {
    return new Map(machines.map((machine) => [machine.id, machine]));
  }, [machines]);

  const runningMachines = useMemo(() => {
    return machines.filter((machine) => machine.status === 'running');
  }, [machines]);

  const totalOutput = useMemo(() => {
    return machines.reduce((sum, machine) => sum + machine.output, 0);
  }, [machines]);

  const averageEfficiency = runningMachines.length > 0
    ? Math.round(runningMachines.reduce((sum, machine) => sum + machine.efficiency, 0) / runningMachines.length)
    : 0;

  const activeJobs = useMemo(() => {
    return jobs.filter((job) => job.status !== 'completed' && job.status !== 'cancelled');
  }, [jobs]);

  const blockedJobs = useMemo(() => {
    return jobs.filter((job) =>
      job.assignedMachines.some((machineId) => {
        const machine = machinesById.get(machineId);
        return machine?.status === 'error' || machine?.status === 'maintenance';
      })
    );
  }, [jobs, machinesById]);

  const machineAvailability = machines.length > 0
    ? Math.round((machines.filter((machine) => machine.status !== 'error' && machine.status !== 'maintenance').length / machines.length) * 100)
    : 0;

  const machineEfficiencyData = machines.map((machine) => ({
    name: machine.name,
    status: machine.status,
    efficiency: machine.status === 'running' ? machine.efficiency : 0,
    output: machine.status === 'running' ? machine.output : 0,
    power: machine.powerConsumption
  }));

  const statusDistribution = [
    { name: 'Running', value: machines.filter((machine) => machine.status === 'running').length, color: '#10B981' },
    { name: 'Idle', value: machines.filter((machine) => machine.status === 'idle').length, color: '#F59E0B' },
    { name: 'Maintenance', value: machines.filter((machine) => machine.status === 'maintenance').length, color: '#3B82F6' },
    { name: 'Error', value: machines.filter((machine) => machine.status === 'error').length, color: '#EF4444' }
  ];

  const jobProgressData = jobs.map((job) => ({
    name: job.productName,
    completed: job.completed,
    remaining: Math.max(0, job.quantity - job.completed),
    progress: job.quantity > 0 ? Math.min(100, (job.completed / job.quantity) * 100) : 0
  }));

  const dailyProductionData = [
    { day: 'Mon', output: 1200, target: 1500 },
    { day: 'Tue', output: 1350, target: 1500 },
    { day: 'Wed', output: 1420, target: 1500 },
    { day: 'Thu', output: 1180, target: 1500 },
    { day: 'Fri', output: 1380, target: 1500 },
    { day: 'Sat', output: 950, target: 1200 },
    { day: 'Sun', output: 680, target: 800 }
  ];

  const getMachineBarColor = (status: Machine['status']) => {
    switch (status) {
      case 'running':
        return '#10B981';
      case 'idle':
        return '#6B7280';
      case 'maintenance':
        return '#3B82F6';
      case 'error':
        return '#EF4444';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Production Analytics</h1>
        <p className="text-gray-400">Performance trends and key production indicators</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Output Today</h3>
          <p className="text-3xl font-bold text-white">{totalOutput}</p>
          <p className="text-sm text-gray-400 mt-1">Across all tracked machines</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Average Efficiency</h3>
          <p className="text-3xl font-bold text-white">
            {averageEfficiency}%
          </p>
          <p className="text-sm text-gray-400 mt-1">Running machines only</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Active Jobs</h3>
          <p className="text-3xl font-bold text-white">{activeJobs.length}</p>
          <p className="text-sm text-gray-400 mt-1">{blockedJobs.length} blocked by machine state</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Machine Availability</h3>
          <p className="text-3xl font-bold text-white">
            {machineAvailability}%
          </p>
          <p className="text-sm text-gray-400 mt-1">Running or idle machines</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Machine Efficiency Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-1">Running Machine Efficiency</h3>
          <p className="text-sm text-gray-400 mb-4">Stopped, maintenance, and error machines are shown as nonproductive.</p>
          {machines.length === 0 ? (
            <EmptyState title="No machine data" message="Live machine telemetry has not arrived yet." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={machineEfficiencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'efficiency' ? `${value}%` : value,
                    name === 'efficiency' ? 'Running efficiency' : name
                  ]}
                  labelFormatter={(label, payload) => {
                    const status = payload?.[0]?.payload?.status;
                    return `${label} (${status})`;
                  }}
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
                <Bar dataKey="efficiency">
                  {machineEfficiencyData.map((entry) => (
                    <Cell key={entry.name} fill={getMachineBarColor(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Machine Status Distribution</h3>
          {machines.length === 0 ? (
            <EmptyState title="No machine states" message="Machine status distribution will appear after telemetry loads." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Demo Production Baseline */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-1">Demo Weekly Output Baseline</h3>
          <p className="text-sm text-gray-400 mb-4">Static baseline for presentation context</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyProductionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Line type="monotone" dataKey="output" stroke="#10B981" strokeWidth={2} name="Actual Output" />
              <Line type="monotone" dataKey="target" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" name="Target" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Job Progress */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Job Progress</h3>
          {jobs.length === 0 ? (
            <EmptyState title="No production jobs" message="Job progress will appear when production jobs are available." />
          ) : (
            <div className="space-y-4">
              {jobProgressData.map((job, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white font-medium">{job.name}</span>
                    <span className="text-gray-400">{Math.round(job.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{job.completed} completed</span>
                    <span>{job.remaining} remaining</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
