import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return format(new Date(date), 'MMM dd, yyyy');
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
}

export function formatRelativeTime(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'SUCCESS':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'FAILED':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'RUNNING':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'PENDING':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'CANCELLED':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function formatServiceType(service: string): string {
  return service.replace(/_/g, ' ');
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '...' : str;
}
