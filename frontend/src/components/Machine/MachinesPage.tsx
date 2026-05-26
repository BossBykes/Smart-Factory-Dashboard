import { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { factoryService } from '../../services/factoryService';
import { Machine } from '../../types/factory';
import { cn, getStatusBgColor, getStatusColor } from '../../utils/helpers';

interface MachinesPageProps {
  onMachineSelect: (machineId: string) => void;
}

type StatusFilter = 'all' | Machine['status'];
type SortOption = 'status' | 'efficiency' | 'temperature' | 'output';

const statusSeverityRank: Record<Machine['status'], number> = {
  error: 0,
  maintenance: 1,
  idle: 2,
  running: 3,
};

export const MachinesPage = ({ onMachineSelect }: MachinesPageProps) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('status');

  useEffect(() => {
    const updateMachines = () => {
      setMachines(factoryService.getAllMachines());
    };

    updateMachines();

    factoryService.addEventListener('data_update', updateMachines);
    factoryService.addEventListener('machine_update', updateMachines);

    return () => {
      factoryService.removeEventListener('data_update', updateMachines);
      factoryService.removeEventListener('machine_update', updateMachines);
    };
  }, []);

  const visibleMachines = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return machines
      .filter((machine) => {
        const matchesStatus = statusFilter === 'all' || machine.status === statusFilter;
        const searchableText = [
          machine.id,
          machine.name,
          machine.location,
          machine.type,
        ].join(' ').toLowerCase();

        return matchesStatus && (!normalizedSearch || searchableText.includes(normalizedSearch));
      })
      .sort((left, right) => {
        switch (sortOption) {
          case 'efficiency':
            return left.efficiency - right.efficiency || left.name.localeCompare(right.name);
          case 'temperature':
            return right.temperature - left.temperature || left.name.localeCompare(right.name);
          case 'output':
            return right.output - left.output || left.name.localeCompare(right.name);
          default:
            return statusSeverityRank[left.status] - statusSeverityRank[right.status] ||
              left.name.localeCompare(right.name);
        }
      });
  }, [machines, searchTerm, sortOption, statusFilter]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Machines</h1>
        <p className="text-gray-400">Search, filter, and inspect individual factory assets</p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4 lg:grid-cols-[1fr_220px_240px]">
        <label className="relative block">
          <span className="sr-only">Search machines</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, ID, location, or type"
            className="w-full rounded-md border border-gray-600 bg-gray-900 py-2 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>

        <label className="block">
          <span className="sr-only">Filter by status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All statuses</option>
            <option value="running">Running</option>
            <option value="idle">Idle</option>
            <option value="error">Error</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Sort machines</span>
          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as SortOption)}
            className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="status">Status severity</option>
            <option value="efficiency">Efficiency low-to-high</option>
            <option value="temperature">Temperature high-to-low</option>
            <option value="output">Output high-to-low</option>
          </select>
        </label>
      </div>

      {visibleMachines.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center">
          <h2 className="text-xl font-semibold text-white">No machines found</h2>
          <p className="mt-2 text-gray-400">Adjust the search or filter to see matching machines.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {visibleMachines.map((machine) => (
            <article
              key={machine.id}
              className={cn(
                "rounded-lg border bg-gray-800 p-6 transition-colors hover:border-gray-500",
                getStatusBgColor(machine.status)
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-white">{machine.name}</h2>
                    <span className="rounded-full border border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-300">
                      {machine.id}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{machine.type} • {machine.location}</p>
                </div>

                <div className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", getStatusColor(machine.status))}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        machine.status === 'running' ? 'bg-green-400' :
                        machine.status === 'error' ? 'bg-red-400' :
                        machine.status === 'maintenance' ? 'bg-blue-400' :
                        'bg-yellow-400'
                      )}
                    />
                    {machine.status}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-400">Efficiency</p>
                  <p className="text-lg font-bold text-white">{machine.efficiency}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Temperature</p>
                  <p className="text-lg font-bold text-white">{machine.temperature}°C</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Vibration</p>
                  <p className="text-lg font-bold text-white">{machine.vibration} mm/s</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Power</p>
                  <p className="text-lg font-bold text-white">{machine.powerConsumption} kW</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Output</p>
                  <p className="text-lg font-bold text-white">{machine.output}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Location</p>
                  <p className="text-sm font-medium text-white">{machine.location}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => onMachineSelect(machine.id)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  View details
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
