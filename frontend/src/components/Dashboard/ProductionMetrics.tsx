import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { factoryService } from '../../services/factoryService';
import { Machine, ProductionJob } from '../../types/factory';

export const ProductionMetrics: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [jobs, setJobs] = useState<ProductionJob[]>([]);

  useEffect(() => {
    const updateData = () => {
      setMachines(factoryService.getAllMachines());
      setJobs(factoryService.getProductionJobs());
    };

    updateData();
    const interval = setInterval(updateData, 3000);

    return () => clearInterval(interval);
  }, []);

  // Prepare data for charts
  const machineEfficiencyData = machines.map(machine => ({
    name: machine.name,
    efficiency: machine.efficiency,
    output: machine.output,
    power: machine.powerConsumption
  }));

  const statusDistribution = [
    { name: 'Running', value: machines.filter(m => m.status === 'running').length, color: '#10B981' },
    { name: 'Idle', value: machines.filter(m => m.status === 'idle').length, color: '#F59E0B' },
    { name: 'Maintenance', value: machines.filter(m => m.status === 'maintenance').length, color: '#3B82F6' },
    { name: 'Error', value: machines.filter(m => m.status === 'error').length, color: '#EF4444' }
  ];

  const jobProgressData = jobs.map(job => ({
    name: job.productName,
    completed: job.completed,
    remaining: job.quantity - job.completed,
    progress: (job.completed / job.quantity) * 100
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
          <p className="text-3xl font-bold text-white">{machines.reduce((sum, m) => sum + m.output, 0)}</p>
          <p className="text-sm text-green-400 mt-1">+12% from yesterday</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Average Efficiency</h3>
          <p className="text-3xl font-bold text-white">
            {Math.round(machines.filter(m => m.status === 'running').reduce((sum, m) => sum + m.efficiency, 0) / machines.filter(m => m.status === 'running').length || 0)}%
          </p>
          <p className="text-sm text-yellow-400 mt-1">-2% from target</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Active Jobs</h3>
          <p className="text-3xl font-bold text-white">{jobs.filter(j => j.status === 'in-progress').length}</p>
          <p className="text-sm text-blue-400 mt-1">2 scheduled</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Machine Uptime</h3>
          <p className="text-3xl font-bold text-white">
            {Math.round(((machines.length - machines.filter(m => m.status === 'error' || m.status === 'maintenance').length) / machines.length) * 100)}%
          </p>
          <p className="text-sm text-green-400 mt-1">Above target</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Machine Efficiency Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Machine Efficiency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={machineEfficiencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar dataKey="efficiency" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Machine Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
        </div>

        {/* Daily Production Trend */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Weekly Production Trend</h3>
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
        </div>
      </div>
    </div>
  );
};