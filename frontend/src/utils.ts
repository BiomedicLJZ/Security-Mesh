// Utility functions shared across components

import { IncidentType, Severity, IncidentStatus } from './types';

/**
 * Format an ISO timestamp as a relative time string (e.g. "5 minutes ago").
 */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Map severity to a CSS class suffix */
export function getSeverityClass(severity: Severity): string {
  return severity.toLowerCase();
}

/** Map incident status to a CSS class suffix */
export function getStatusClass(status: IncidentStatus): string {
  return status.replace('_', '-');
}

/** Map incident type to an emoji icon */
export function getTypeEmoji(type: IncidentType): string {
  const map: Record<IncidentType, string> = {
    fire:             '🔥',
    intrusion:        '🔓',
    medical:          '🏥',
    hazmat:           '☣️',
    traffic:          '🚗',
    cyber:            '💻',
    natural_disaster: '🌪️',
    unknown:          '❓',
  };
  return map[type] ?? '❓';
}
