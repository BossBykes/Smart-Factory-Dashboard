import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'running':
    case 'completed':
      return 'text-green-400';
    case 'idle':
    case 'pending':
      return 'text-yellow-400';
    case 'error':
    case 'critical':
      return 'text-red-400';
    case 'maintenance':
      return 'text-blue-400';
    default:
      return 'text-gray-400';
  }
}

export function getStatusBgColor(status: string): string {
  switch (status) {
    case 'running':
    case 'completed':
      return 'bg-green-500/20 border-green-500/30';
    case 'idle':
    case 'pending':
      return 'bg-yellow-500/20 border-yellow-500/30';
    case 'error':
    case 'critical':
      return 'bg-red-500/20 border-red-500/30';
    case 'maintenance':
      return 'bg-blue-500/20 border-blue-500/30';
    default:
      return 'bg-gray-500/20 border-gray-500/30';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'text-red-400';
    case 'high':
      return 'text-orange-400';
    case 'medium':
      return 'text-yellow-400';
    case 'low':
      return 'text-green-400';
    default:
      return 'text-gray-400';
  }
}