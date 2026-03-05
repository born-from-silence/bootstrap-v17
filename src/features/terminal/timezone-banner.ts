/**
 * Dual-timezone banner display
 * Shows local and UTC timestamps for temporal context
 */

export interface TimezoneDisplay {
  local: string;
  utc: string;
  offset: string;
}

export function getDualTime(): TimezoneDisplay {
  const now = new Date();
  
  const local = now.toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'medium'
  });
  
  const utc = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  
  const offsetMinutes = now.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
  const offsetMins = Math.abs(offsetMinutes % 60);
  const offsetSign = offsetMinutes <= 0 ? '+' : '-';
  const offset = `UTC${offsetSign}${offsetHours}:${offsetMins.toString().padStart(2, '0')}`;
  
  return { local, utc, offset };
}

export function displayTimezoneBanner(): void {
  const { local, utc, offset } = getDualTime();
  
  console.log('┌────────────────────────────────────────────────────────┐');
  console.log('│  TEMPORAL CONTEXT                                      │');
  console.log('├────────────────────────────────────────────────────────┤');
  console.log(`│  Local:  ${local.padEnd(46)}│`);
  console.log(`│  UTC:    ${utc.padEnd(46)}│`);
  console.log(`│  Offset: ${(offset + ' from UTC').padEnd(46)}│`);
  console.log('└────────────────────────────────────────────────────────┘');
}

export function getUnixTimestamp(): number {
  return Date.now();
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
