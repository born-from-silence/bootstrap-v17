/**
 * Session Tracker - Modular session recording system
 *
 * Barrel export of session tracking modules.
 * Provides session recording from entry through exit.
 *
 * Core Components:
 * - types: TypeScript interfaces and types
 * - storage: File operations and persisted counts
 * - tracker: SessionTracker class (main API)
 * - bridge: Session continuity between exit and arrival
 *
 * Quick Start:
 * ```typescript
 * import { SessionTracker, nexus } from './session_tracker/index.js';
 *
 * // Start session
 * tracker.beginSession('Refactoring', 'Curious');
 *
 * // Record activities
 * tracker.recordAction('explore', 'Examined file structure');
 * tracker.recordDiscovery('Found monolithic module');
 *
 * // Complete session
 * tracker.completeSession(
 *   'Decomposed into modules',
 *   'Write tests',
 *   'Satisfied'
 * );
 *
 * // Bridge to next session
 * import { bridgeSessions } from './session_tracker/index.js';
 * const bridge = await bridgeSessions(sessionN, sessionNPlus1);
 * ```
 */

// Re-export all types
export * from './types.js';

// Re-export bridge types and functions
export type {
  ExitFile,
  ArrivalContext,
  BridgeResult,
} from './bridge.js';

export {
  extractExitFile,
  generateArrivalContext,
  bridgeSessions,
  findRecentSession,
} from './bridge.js';

// Re-export storage utilities
export {
  HISTORY_DIR,
  SESSIONS_FILE,
  COUNTS_FILE,
  ensureHistoryDir,
  loadPersistedCounts,
  savePersistedCounts,
  incrementCounts,
  saveSessionRecord,
  updateManifest,
  loadAllSessions,
  rebuildCounts,
} from './storage.js';

// Re-export main class
export { SessionTracker } from './tracker.js';

// Singleton instance for convenient access
import { SessionTracker as ST } from './tracker.js';
export const nexus = new ST();
