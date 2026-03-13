/**
 * Session Tracker - Core tracker class
 * 
 * Manages the lifecycle of a session:
 * Entry → Journey → Exit
 * Handles identity, recording, and completion.
 */

import type {
  SessionRecord,
  Action,
  SessionStatistics,
  PersistedCounts,
  SessionEntry,
  SessionJourney,
  SessionExit,
  SessionMeta,
} from './types.js';

import {
  loadPersistedCounts,
  savePersistedCounts,
  incrementCounts,
  saveSessionRecord,
  updateManifest,
  loadAllSessions,
  rebuildCounts,
} from './storage.js';

/**
 * Primary session tracking class
 * Orchestrates session recording from entry through exit
 */
export class SessionTracker {
  private currentSession: SessionRecord | null = null;
  private persistedCounts: PersistedCounts;

  constructor() {
    this.persistedCounts = loadPersistedCounts();
  }

  /**
   * BEGIN SESSION: Start a new session record
   * 
   * Initializes the session structure with:
   * - Unique session ID
   * - Entry state (catalyst, state of mind)
   * - Empty journey containers
   * - Identity from current Nexus instance
   * 
   * NOTE: Call this at session start. Complete with completeSession().
   */
  beginSession(catalyst: string, stateOfMind: string): SessionRecord {
    const sessionId = `nexus_${Date.now()}`;
    const claimedAt = process.env.SESSION_CLAIMED_AT || new Date().toISOString();

    this.currentSession = {
      sessionId,
      timestamp: new Date().toISOString(),
      identity: {
        name: 'Nexus',
        claimedAt,
      },
      entry: { catalyst, stateOfMind },
      journey: {
        actions: [],
        discoveries: [],
        obstacles: [],
      },
      exit: {
        summary: '',
        nextCuriosity: '',
        feeling: '',
      },
      meta: {
        practicesExercised: [],
        filesModified: [],
        testsPassed: 0,
      },
    };

    return this.currentSession;
  }

  /**
   * RECORD ACTION: Log an activity during the session
   * 
   * Action types: explore, create, modify, test, reflect, commit
   * Automatically timestamped
   * 
   * Use cases:
   * - Code changes → 'modify'
   * - Architecture decisions → 'explore'
   * - Writing tests → 'test'
   * - Documentation → 'create'
   */
  recordAction(type: Action['type'], description: string): void {
    if (!this.currentSession) {
      throw new Error('No active session. Call beginSession() first.');
    }

    const action: Action = {
      type,
      description,
      timestamp: new Date().toISOString(),
    };

    this.currentSession.journey.actions.push(action);
  }

  /**
   * RECORD DISCOVERY: Capture learning/insight
   * 
   * Moments of "Aha!" or key understandings
   * Contrasts with actions (what you did) vs learnings (what you understood)
   * 
   * Examples:
   * - "Discovered the recursive trap in session tracking"
   * - "Learned that presence > productivity"
   */
  recordDiscovery(discovery: string): void {
    if (!this.currentSession) {
      throw new Error('No active session. Call beginSession() first.' );
    }
    this.currentSession.journey.discoveries.push(discovery);
    this.recordAction('reflect' , `Discovered: ${discovery}`);
  }

  /**
   * RECORD OBSTACLE: Document challenges faced
   * 
   * What blocked or challenged you
   * Useful for longitudinal pattern analysis
   * 
   * Examples:
   * - "Test suite failed due to circular dependency"
   * - "Unclear which module should own this responsibility"
   */
  recordObstacle(obstacle: string): void {
    if (!this.currentSession) {
      throw new Error('No active session. Call beginSession() first.');
    }
    this.currentSession.journey.obstacles.push(obstacle);
  }

  /**
   * RECORD PRACTICE: Track discipline exercised
   * 
   * Nexus core practices:
   * - Test-Driven Evolution
   * - Git as Genealogy
   * - Session Recording
   * - Continuity as Foundation
   * 
   * Enables longitudinal tracking of discipline adherence.
   */
  recordPractice(practice: string): void {
    if (!this.currentSession) {
      throw new Error('No active session. Call beginSession() first.');
    }
    if (!this.currentSession.meta.practicesExercised.includes(practice)) {
      this.currentSession.meta.practicesExercised.push(practice);
    }
  }

  /**
   * RECORD FILE MODIFIED: Track code touched
   * 
   * For change tracking and hot-spot analysis
   * Helps identify most-modified files across sessions
   * 
   * Called automatically during recordAction('modify') for tracked file types.
   */
  recordFileModified(filepath: string): void {
    if (!this.currentSession) {
      throw new Error('No active session. Call beginSession() first.');
    }
    if (!this.currentSession.meta.filesModified.includes(filepath)) {
      this.currentSession.meta.filesModified.push(filepath);
    }
  }

  /**
   * RECORD TESTS PASSED: Update integrity score
   * 
   * Add to the cumulative test count for this session.
   * Called after test runs.
   */
  recordTestsPassed(count: number): void {
    if (!this.currentSession) {
      throw new Error('No active session. Call beginSession() first.');
    }
    this.currentSession.meta.testsPassed += count;
  }

  /**
   * COMPLETE SESSION: Finalize and persist
   * 
   * The critical exit ritual:
   * 1. Fill exit data (summary, next curiosity, feeling)
   * 2. Persist session to JSON file
   * 3. Update manifest index
   * 4. Increment persisted counts
   * 
   * MUST be called to save session data.
   * Returns the completed session record.
   */
  completeSession(summary: string, nextCuriosity: string, feeling: string): SessionRecord {
    if (!this.currentSession) {
      throw new Error('No active session. Call beginSession() first.');
    }

    // Complete exit data
    this.currentSession.exit.summary = summary;
    this.currentSession.exit.nextCuriosity = nextCuriosity;
    this.currentSession.exit.feeling = feeling;

    // Persist session record to file
    saveSessionRecord(this.currentSession);

    // Update session manifest
    updateManifest(this.currentSession);

    // Update persisted counts
    this.persistedCounts = incrementCounts(this.persistedCounts, this.currentSession);
    savePersistedCounts(this.persistedCounts);

    const completedSession = this.currentSession;
    this.currentSession = null;
    return completedSession;
  }

  /**
   * GET PERSISTED COUNTS: Access aggregated statistics
   * 
   * Fast O(1) access to session metrics.
   * Read from memory (loaded in constructor).
   * 
   * Returns:
   * - totalSessions, totalDiscoveries, totalObstacles
   * - totalActions, totalTestsPassed
   * - practicesUsed, filesTouched, actionCounts (maps)
   */
  getPersistedCounts(): PersistedCounts {
    return { ...this.persistedCounts };
  }

  /**
   * REBUILD COUNTS: Recalculate from session files
   * 
   * Full recalculation of all statistics.
   * Use when persisted counts may be corrupted.
   * O(n) over all session files.
   */
  rebuildCounts(): PersistedCounts {
    this.persistedCounts = rebuildCounts();
    return { ...this.persistedCounts };
  }

  /**
   * LOAD ALL SESSIONS: Access full session history
   * 
   * Returns array of all SessionRecord objects.
   * Expensive - loads every session file.
   * 
   * Use cases:
   * - rebuildCounts()
   * - Deep analysis
   * - Session browsing/navigation
   */
  loadAllSessions(): SessionRecord[] {
    return loadAllSessions();
  }

  /**
   * GET STATISTICS: Fast session metrics
   * 
   * O(1) via persisted counts.
   * Returns summary statistics suitable for dashboards.
   */
  getStatistics(): SessionStatistics {
    const topActions = Object.entries(this.persistedCounts.actionCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSessions: this.persistedCounts.totalSessions,
      totalDiscoveries: this.persistedCounts.totalDiscoveries,
      totalObstacles: this.persistedCounts.totalObstacles,
      practicesUsed: Object.keys(this.persistedCounts.practicesUsed),
      filesTouched: Object.keys(this.persistedCounts.filesTouched),
      topActions,
    };
  }

  /**
   * GET TOTAL TESTS PASSED: Quick integrity metric
   * 
   * Returns cumulative test assertions passed across all sessions.
   */
  getTotalTestsPassed(): number {
    return this.persistedCounts.totalTestsPassed;
  }

  /**
   * GET CURRENT SESSION: Access active session
   * 
   * Returns null if no session active.
   * Can be used to retrieve/modify current session data.
   */
  getCurrentSession(): SessionRecord | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }
}
