import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatPercentage(value: number | null): string {
  if (value === null) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

export function getSeverityColor(severity: string | null): string {
  switch (severity?.toLowerCase()) {
    case 'healthy':
      return 'text-green-600 bg-green-100';
    case 'mild':
      return 'text-yellow-600 bg-yellow-100';
    case 'moderate':
      return 'text-orange-600 bg-orange-100';
    case 'severe':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getStatusColor(status: string | null): string {
  switch (status?.toLowerCase()) {
    case 'healthy':
      return 'text-green-600 bg-green-100';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'completed':
      return 'text-blue-600 bg-blue-100';
    case 'critical':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Get the full URL for an image from its path
 * Handles both Supabase Storage URLs (https://...) and local paths (/uploads/...)
 */
export function getImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  
  // If it's already a full URL (Supabase Storage), return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a local path, construct backend URL
  // Backend serves images at /api/images/<filename>
  const filename = imagePath.split('/').pop() || imagePath;
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/images/${filename}`;
}
