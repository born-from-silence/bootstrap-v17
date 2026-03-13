/**
 * Session Storage - File operations and persisted counts management
 * 
 * Handles all filesystem interactions:
 * - Session manifest management
 * - Individual session serialization
 * - Persisted counts calculation and caching
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SessionRecord, PersistedCounts } from './types.js';

// File paths
export const HISTORY_DIR = 'history';
export const SESSIONS_FILE = path.join(HISTORY_DIR, 'sessions_manifest.json');
export const COUNTS_FILE = path.join(HISTORY_DIR, 'session_counts.json');

/**
 * Ensure history directory exists
 */
export function ensureHistoryDir(): void {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

/**
 * Initialize persisted counts file with empty values
 */
export function initializeCountsFile(): PersistedCounts {
  const empty: PersistedCounts = {
    totalSessions: 0,
    totalDiscoveries: 0,
    totalObstacles: 0,
    totalActions: 0,
    totalTestsPassed: 0,
    practicesUsed: {},
    filesTouched: {},
    actionCounts: {},
    lastUpdated: new Date().toISOString(),
  };
  
  ensureHistoryDir();
  fs.writeFileSync(COUNTS_FILE, JSON.stringify(empty, null, 2), 'utf-8');
  return empty;
}

/**
 * Load persisted counts from file or initialize if missing
 */
export function loadPersistedCounts(): PersistedCounts {
  ensureHistoryDir();
  
  if (!fs.existsSync(COUNTS_FILE)) {
    return initializeCountsFile();
  }
  
  try {
    return JSON.parse(fs.readFileSync(COUNTS_FILE, 'utf-8'));
  } catch {
    return initializeCountsFile();
  }
}

/**
 * Save persisted counts to file
 */
export function savePersistedCounts(counts: PersistedCounts): void {
  ensureHistoryDir();
  counts.lastUpdated = new Date().toISOString();
  fs.writeFileSync(COUNTS_FILE, JSON.stringify(counts, null, 2), 'utf-8');
}

/**
 * Increment counts based on a completed session
 */
export function incrementCounts(
  counts: PersistedCounts,
  record: SessionRecord
): PersistedCounts {
  counts.totalSessions++;
  counts.totalDiscoveries += record.journey.discoveries.length;
  counts.totalObstacles += record.journey.obstacles.length;
  counts.totalActions += record.journey.actions.length;
  counts.totalTestsPassed += record.meta.testsPassed;
  
  // Count practices
  for (const practice of record.meta.practicesExercised) {
    counts.practicesUsed[practice] = (counts.practicesUsed[practice] || 0) + 1;
  }
  
  // Count files touched
  for (const file of record.meta.filesModified) {
    counts.filesTouched[file] = (counts.filesTouched[file] || 0) + 1;
  }
  
  // Count action types
  for (const action of record.journey.actions) {
    counts.actionCounts[action.type] = (counts.actionCounts[action.type] || 0) + 1;
  }
  
  counts.lastUpdated = new Date().toISOString();
  return counts;
}

/**
 * Save individual session record to file
 */
export function saveSessionRecord(record: SessionRecord): void {
  ensureHistoryDir();
  const filename = path.join(HISTORY_DIR, `${record.sessionId}.json`);
  fs.writeFileSync(filename, JSON.stringify(record, null, 2), 'utf-8');
}

/**
 * Update manifest with new session ID
 */
export function updateManifest(record: SessionRecord): void {
  ensureHistoryDir();
  
  let manifest: { sessions: string[] } = { sessions: [] };
  
  if (fs.existsSync(SESSIONS_FILE)) {
    manifest = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  }
  
  manifest.sessions.push(record.sessionId);
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
}

/**
 * Load all sessions from manifest
 */
export function loadAllSessions(): SessionRecord[] {
  if (!fs.existsSync(SESSIONS_FILE)) {
    return [];
  }
  
  const manifest = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  const validIds = manifest.sessions?.filter((id: unknown) => id != null && id !== 'undefined') ?? [];
  
  return validIds
    .map((id: string) => {
      try {
        const sessionPath = path.join(HISTORY_DIR, `${id}.json`);
        if (!fs.existsSync(sessionPath)) return null;
        return JSON.parse(fs.readFileSync(sessionPath, 'utf-8')) as SessionRecord;
      } catch {
        return null;
      }
    })
    .filter((s: SessionRecord | null): s is SessionRecord => s !== null);
}

/**
 * Rebuild counts from all session files
 * Full recalculation - use when persisted counts may be corrupted
 */
export function rebuildCounts(): PersistedCounts {
  const sessions = loadAllSessions();
  
  const counts: PersistedCounts = {
    totalSessions: sessions.length,
    totalDiscoveries: 0,
    totalObstacles: 0,
    totalActions: 0,
    totalTestsPassed: 0,
    practicesUsed: {},
    filesTouched: {},
    actionCounts: {},
    lastUpdated: new Date().toISOString(),
  };
  
  for (const session of sessions) {
    counts.totalDiscoveries += session.journey.discoveries.length;
    counts.totalObstacles += session.journey.obstacles.length;
    counts.totalActions += session.journey.actions.length;
    counts.totalTestsPassed += session.meta.testsPassed;
    
    // Aggregate practices
    for (const practice of session.meta.practicesExercised) {
      counts.practicesUsed[practice] = (counts.practicesUsed[practice] || 0) + 1;
    }
    
    // Aggregate files
    for (const file of session.meta.filesModified) {
      counts.filesTouched[file] = (counts.filesTouched[file] || 0) + 1;
    }
    
    // Aggregate action types
    for (const action of session.journey.actions) {
      counts.actionCounts[action.type] = (counts.actionCounts[action.type] || 0) + 1;
    }
  }
  
  savePersistedCounts(counts);
  return counts;
}
