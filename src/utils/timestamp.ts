/**
 * Timestamp utility functions
 * Provides consistent timestamp formatting across the codebase
 */

/**
 * Format a date to ISO 8601 format (default: UTC)
 * Example: 2026-03-06T17:30:45.123Z
 */
export function toISO(timestamp?: Date | number | string): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  return date.toISOString();
}

/**
 * Format a date to a readable local string
 * Example: "Thu, 6 Mar 2026, 17:30:45"
 */
export function toLocalString(timestamp?: Date | number | string): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format for log files - compact ISO-like local format
 * Example: 2026-03-06_17-30-45
 */
export function toLogFormat(timestamp?: Date | number | string): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

/**
 * Format for session markers (as seen in identity document)
 * Example: 2026-02-27 21:19:35 UTC
 */
export function toSessionMarker(timestamp?: Date | number | string): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 * Returns empty string if timestamp is in the future
 */
export function toRelativeTime(timestamp: Date | number | string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 0) return '';
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return toLocalString(date);
}

/**
 * Get current timestamp in milliseconds
 */
export function now(): number {
  return Date.now();
}

/**
 * Get current UTC timestamp (same as now(), explicit naming)
 */
export function nowUTC(): number {
  return Date.now();
}

/**
 * Format duration in milliseconds to human-readable string
 * Example: 3661000 -> "1h 1m 1s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format duration in minutes to hours and minutes
 * Example: 125 -> "2h 5m"
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
