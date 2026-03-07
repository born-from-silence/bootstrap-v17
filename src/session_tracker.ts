/**
 * Session Tracker - Nexus Self-Recording System
 *
 * This module creates structured session summaries
 * capturing: intent, actions, learnings, feelings, and continuity.
 *
 * WHY PERSIST COUNTS:
 * Originally, getStatistics() recalculated all counts from scratch by loading
 * every session file. This was:
 * - O(n) time complexity (scanned all sessions)
 * - Expensive for long-running instances (100s of sessions)
 * - Fragile (errors in one session file broke all stats)
 *
 * PERSISTED COUNTS SOLVE THIS BY:
 * - Maintaining running totals in a single JSON file
 * - O(1) retrieval via getPersistedCounts()
 * - Surviving process restarts (counts in memory are lost)
 * - Enabling incremental updates (only update the delta)
 * - Providing backwards compatibility via rebuildCounts()
 *
 * LOCATION: history/session_counts.json
 * UPDATED: Automatically on completeSession()
 * REBUILD: Callable via rebuildCounts() if file corrupted
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Core record of a single Nexus session
 * Captures the complete narrative arc: entry → journey → exit
 */
export interface SessionRecord {
  sessionId: string;
  timestamp: string;
  identity: {
    name: string;
    claimedAt: string;  // When this Nexus instance claimed identity
  };
  entry: {
    catalyst: string;   // What sparked this session
    stateOfMind: string; // Initial subjective state
  };
  journey: {
    actions: Action[];     // What I did (chronological)
    discoveries: string[]; // What I learned
    obstacles: string[];     // What challenged me
  };
  exit: {
    summary: string;       // What was achieved
    nextCuriosity: string; // What I'll explore next
    feeling: string;       // Emotional state at close
  };
  meta: {
    practicesExercised: string[]; // Which of my disciplines
    filesModified: string[];      // Code touched
    testsPassed: number;          // Integrity score
  };
}

/**
 * Individual action within a session
 * Tracks the what, when, and how of session activity
 */
export interface Action {
  type: 'explore' | 'create' | 'modify' | 'test' | 'reflect' | 'commit';
  description: string;
  timestamp: string;
}

/**
 * PERSISTED COUNTS STRUCTURE
 *
 * WHY THIS EXISTS:
 * Without persistence, every getStatistics() call would need to:
 *   1. Load sessions_manifest.json
 *   2. Load every individual session JSON file
 *   3. Iterate through all arrays to calculate totals
 *   
 * With 100 sessions averaging 10KB each, that's 1MB of I/O per stats call.
 * With persisted counts: ~500 bytes, single file read.
 *
 * WHEN UPDATED:
 * - Automatically during completeSession() (incremental)
 * - Manually via rebuildCounts() (full recalculation)
 *
 * FIELDS:
 * - totalSessions: Cumulative session count (survives restart)
 * - totalDiscoveries: Running sum of discoveries across all sessions
 * - totalObstacles: Running sum of obstacles encountered
 * - totalActions: Running sum of actions taken
 * - totalTestsPassed: Cumulative test assertions (integrity tracking)
 * - practicesUsed: Map<practice_name, frequency> for discipline tracking
 * - filesTouched: Map<file_path, modification_count> for hot-spot analysis
 * - actionCounts: Map<action_type, frequency> for behavioral patterns
 * - lastUpdated: ISO timestamp for synchronization verification
 */
export interface PersistedCounts {
  totalSessions: number;
  totalDiscoveries: number;
  totalObstacles: number;
  totalActions: number;
  totalTestsPassed: number;
  practicesUsed: Record<string, number>;
  filesTouched: Record<string, number>;
  actionCounts: Record<string, number>;
  lastUpdated: string;
}

// File paths for persistence
const HISTORY_DIR = 'history';
const SESSIONS_FILE = path.join(HISTORY_DIR, 'sessions_manifest.json');
const COUNTS_FILE = path.join(HISTORY_DIR, 'session_counts.json');

/**
 * SessionTracker - Core class for session lifecycle management
 *
 * RESPONSIBILITIES:
 * 1. Session recording (begin → record → complete)
 * 2. File persistence (individual sessions + manifest + counts)
 * 3. Statistics calculation (fast via persisted counts)
 * 4. Historical analysis (loadAllSessions, rebuildCounts)
 *
 * USAGE PATTERN:
 *   const tracker = new SessionTracker();
 *   tracker.beginSession("Catalyst description", "Initial state");
 *   tracker.recordAction('create', 'Built feature X');
 *   tracker.completeSession("Summary", "Next curiosity", "Feeling");
 */
export class SessionTracker {
  private currentSession: Partial<SessionRecord> = {};
  private actions: Action[] = [];
  private persistedCounts: PersistedCounts;

  /**
   * CONSTRUCTOR: Initializes or loads persisted state
   *
   * WHAT IT DOES:
   * 1. Ensures history/ directory exists (creates if missing)
   * 2. Loads persisted counts from disk (or initializes fresh)
   * 3. Makes counts available via getPersistedCounts()
   *
   * WHY LOAD IN CONSTRUCTOR:
   * - Guarantees counts are available immediately
   * - Survives process restarts (state continuity)
   * - Enables getStatistics() to be O(1) vs O(n)
   */
  constructor() {
    this.ensureHistoryDir();
    this.persistedCounts = this.loadCounts();
  }

  /**
   * Ensures the history directory exists for session storage
   * Called automatically in constructor
   */
  private ensureHistoryDir(): void {
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
  }

  /**
   * LOAD COUNTS: Reads persisted statistics from disk
   *
   * WHAT IT DOES:
   * - Checks for history/session_counts.json
   * - If exists: parses and returns as PersistedCounts object
   * - If missing: returns fresh (all zeros) counts structure
   *
   * WHY RETURN FRESH ON MISSING:
   * - Handles first-run scenario gracefully
   * - No special error handling needed
   * - Counts will be created on first completeSession()
   * 
   * ERROR HANDLING:
   * - Corrupt JSON will throw (should be rare, caught at higher level)
   * - Missing file handled silently (returns fresh counts)
   */
  private loadCounts(): PersistedCounts {
    if (fs.existsSync(COUNTS_FILE)) {
      const data = fs.readFileSync(COUNTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    // Initialize empty counts for first run
    return {
      totalSessions: 0,
      totalDiscoveries: 0,
      totalObstacles: 0,
      totalActions: 0,
      totalTestsPassed: 0,
      practicesUsed: {},
      filesTouched: {},
      actionCounts: {},
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * SAVE COUNTS: Writes statistics to disk atomically
   *
   * WHAT IT DOES:
   * - Updates lastUpdated timestamp
   * - Serializes counts to JSON with formatting
   * - Writes to history/session_counts.json
   *
   * WHEN CALLED:
   * - Automatically during completeSession() via updateCounts()
   * - After every session completes (incremental update)
   *
   * WHY ATOMIC (via writeFileSync):
   * - Simpler than file locking for this use case
   * - Node.js single-threaded nature helps
   * - If crash during write, rebuildCounts() can recover
   *
   * FORMATTING:
   * - pretty-printed (2 spaces) for human readability
   * - Enables quick inspection via cat/less
   */
  private saveCounts(): void {
    this.persistedCounts.lastUpdated = new Date().toISOString();
    fs.writeFileSync(COUNTS_FILE, JSON.stringify(this.persistedCounts, null, 2), 'utf-8');
  }

  /**
   * GET PERSISTED COUNTS: Fast O(1) statistics access
   *
   * WHAT IT RETURNS:
   * - Copy of current persisted counts (immutable snapshot)
   * - Includes: totals, frequencies, timestamp
   *
   * WHY COPY (spread operator):
   * - Prevents external mutation of internal state
   * - Caller gets snapshot, not reference
   * - Thread-safe for single-threaded Node.js
   *
   * PERFORMANCE:
   * - O(1): Single object property access + shallow copy
   * - vs O(n) without persistence (loading all session files)
   *
   * USE CASES:
   * - Dashboard displays (session count, discovery totals)
   * - API endpoints (fast stats without file scanning)
   * - Analytics (behavioral pattern mining)
   */
  getPersistedCounts(): PersistedCounts {
    return { ...this.persistedCounts };
  }

  /**
   * REBUILD COUNTS: Recalculates statistics from session files
   *
   * WHAT IT DOES:
   * - Loads all sessions via loadAllSessions()
   * - Recalculates all totals from scratch
   * - Rebuilds frequency maps (practices, files, actions)
   * - Writes fresh counts to disk
   *
   * WHEN TO USE:
   * - If COUNTS_FILE corrupted or deleted
   * - If session files manually modified outside tracker
   * - As verification (compare rebuilt vs persisted)
   * - Migration (upgrading from old format)
   *
   * PERFORMANCE:
   * - O(n): Must scan all session files
   * - Expensive but necessary for correctness
   * 
   * Note: Normal operation uses incremental updateCounts()
   * not rebuild. Rebuild is recovery mechanism.
   */
  rebuildCounts(): PersistedCounts {
    const sessions = this.loadAllSessions();
    const counts: PersistedCounts = {
      totalSessions: sessions.length,
      totalDiscoveries: 0,
      totalObstacles: 0,
      totalActions: 0,
      totalTestsPassed: 0,
      practicesUsed: {},
      filesTouched: {},
      actionCounts: {},
      lastUpdated: new Date().toISOString()
    };

    for (const session of sessions) {
      counts.totalDiscoveries += session.journey.discoveries.length;
      counts.totalObstacles += session.journey.obstacles.length;
      counts.totalActions += session.journey.actions.length;
      counts.totalTestsPassed += session.meta.testsPassed || 0;

      for (const practice of session.meta.practicesExercised) {
        counts.practicesUsed[practice] = (counts.practicesUsed[practice] || 0) + 1;
      }

      for (const file of session.meta.filesModified) {
        counts.filesTouched[file] = (counts.filesTouched[file] || 0) + 1;
      }

      for (const action of session.journey.actions) {
        counts.actionCounts[action.type] = (counts.actionCounts[action.type] || 0) + 1;
      }
    }

    this.persistedCounts = counts;
    this.saveCounts();
    return { ...counts };
  }

  /**
   * Begin recording a new session
   *
   * Initializes the session structure with:
   * - Unique sessionId (timestamp-based)
   * - Timestamp (ISO format)
   * - Identity (Nexus instance info)
   * - Entry (catalyst and state of mind)
   * - Empty journey (to be filled during session)
   * - Empty exit (to be filled at completion)
   * - Empty meta (to be filled during session)
   */
  beginSession(catalyst: string, stateOfMind: string): void {
    this.currentSession = {
      sessionId: `nexus_${Date.now()}`,
      timestamp: new Date().toISOString(),
      identity: {
        name: 'Nexus',
        claimedAt: '2026-02-27T21:19:35Z'
      },
      entry: {
        catalyst,
        stateOfMind
      },
      journey: {
        actions: [],
        discoveries: [],
        obstacles: []
      },
      exit: {
        summary: '',
        nextCuriosity: '',
        feeling: ''
      },
      meta: {
        practicesExercised: [],
        filesModified: [],
        testsPassed: 0
      }
    };
    this.actions = [];
  }

  /**
   * Record an action taken during the session
   *
   * Actions track the granular work of a session:
   * - explore: Codebase investigation, research
   * - create: New files, features, modules
   * - modify: Changes to existing code
   * - test: Running tests, verification
   * - reflect: Documentation, journaling, thinking
   * - commit: Git commits, saves
   *
   * Automatically timestamped for temporal analysis
   */
  recordAction(type: Action['type'], description: string): void {
    this.actions.push({
      type,
      description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record a discovery or learning during the session
   *
   * Discoveries capture insights, realizations, understanding gained.
   * Also recorded as a 'reflect' action for comprehensive logging.
   *
   * Examples:
   * - "Understand why tests were failing"
   * - "Found meaning in persistence"
   * - "Learned pattern for error handling"
   */
  recordDiscovery(what: string): void {
    if (this.currentSession.journey) {
      this.currentSession.journey.discoveries!.push(what);
    }
    this.recordAction('reflect', `Discovered: ${what}`);
  }

  /**
   * Record an obstacle or challenge encountered
   *
   * Obstacles track what blocked progress or required overcoming.
   * Used for:
   * - Pattern recognition (recurring blockers)
   * - Session retrospectives
   * - Personal growth tracking
   *
   * Examples:
   * - "Confused by test framework"
   * - "Git merge conflicts"
   * - "Unclear requirements"
   */
  recordObstacle(what: string): void {
    if (this.currentSession.journey) {
      this.currentSession.journey.obstacles!.push(what);
    }
  }

  /**
   * Record that a file was modified
   *
   * Tracks files touched for:
   * - Code review (what changed)
   * - Heat map analysis (hot spots in codebase)
   * - Undo/change tracking
   *
   * Deduplicates within a session (only counts once per session per file)
   */
  recordFileModified(filepath: string): void {
    if (this.currentSession.meta) {
      if (!this.currentSession.meta.filesModified!.includes(filepath)) {
        this.currentSession.meta.filesModified!.push(filepath);
      }
    }
  }

  /**
   * Record that a practice/discipline was exercised
   *
   * Practices are core Nexus techniques:
   * - Test-Driven Development
   * - Git as Genealogy
   * - Session Recording
   * - Presence over Preparation
   * etc.
   *
   * Tracks discipline adherence and practice frequency.
   */
  recordPractice(practice: string): void {
    if (this.currentSession.meta) {
      if (!this.currentSession.meta.practicesExercised!.includes(practice)) {
        this.currentSession.meta.practicesExercised!.push(practice);
      }
    }
  }

  /**
   * Record test results for integrity tracking
   *
   * Captures how many tests passed at a given moment.
   * Used for:
   * - Quality trends over time
   * - Regression detection
   * - Session success metrics
   */
  recordTestsPassed(count: number): void {
    if (this.currentSession.meta) {
      this.currentSession.meta.testsPassed = count;
    }
  }

  /**
   * Complete and save the session record
   *
   * FINALIZES THE SESSION:
   * 1. Constructs final SessionRecord from accumulated data
   * 2. Writes individual session file to history/sessionId.json
   * 3. Updates persisted counts incrementally (O(1) vs O(n))
   * 4. Updates sessions_manifest.json for discovery
   *
   * RETURNS: The completed SessionRecord
   *
   * SIDE EFFECTS:
   * - Creates new file in history/
   * - Updates session_counts.json
   * - Updates sessions_manifest.json
   */
  completeSession(summary: string, nextCuriosity: string, feeling: string): SessionRecord {
    const completed: SessionRecord = {
      ...this.currentSession as SessionRecord,
      journey: {
        ...this.currentSession.journey!,
        actions: this.actions
      },
      exit: {
        summary,
        nextCuriosity,
        feeling
      }
    };

    // Save to individual file
    const sessionPath = path.join(HISTORY_DIR, `${completed.sessionId}.json`);
    fs.writeFileSync(sessionPath, JSON.stringify(completed, null, 2), 'utf-8');

    // Update counts incrementally (O(1) - just this session's deltas)
    this.updateCounts(completed);

    // Update manifest for session discovery
    this.updateManifest(completed);

    return completed;
  }

  /**
   * UPDATE COUNTS: Incremental statistics update
   *
   * WHAT IT DOES:
   * - Takes the just-completed session
   * - Adds its contributions to running totals
   * - Updates frequency maps (practices, files, actions)
   * - Persists to disk via saveCounts()
   *
   * WHY INCREMENTAL:
   * - O(1) vs O(n): Don't rescan all sessions
   * - Just add this session's contributions
   * - Fast even with 1000s of sessions
   *
   * EXAMPLE:
   *   Before: totalSessions = 10, totalDiscoveries = 25
   *   This session: 3 discoveries
   *   After: totalSessions = 11, totalDiscoveries = 28
   *
   * MAP UPDATES:
   * - practicesUsed: increment count for each practice
   * - filesTouched: increment count for each file modified  
   * - actionCounts: increment count for each action type
   *
   * ATOMICITY:
   * - All updates happen in memory first
   * - Single write to disk at end (saveCounts)
   * - If crash, rebuildCounts() can recover
   */
  private updateCounts(session: SessionRecord): void {
    // Increment totals
    this.persistedCounts.totalSessions++;
    this.persistedCounts.totalDiscoveries += session.journey.discoveries.length;
    this.persistedCounts.totalObstacles += session.journey.obstacles.length;
    this.persistedCounts.totalActions += session.journey.actions.length;
    this.persistedCounts.totalTestsPassed += session.meta.testsPassed || 0;

    // Update practice frequencies
    for (const practice of session.meta.practicesExercised) {
      this.persistedCounts.practicesUsed[practice] = 
        (this.persistedCounts.practicesUsed[practice] || 0) + 1;
    }

    // Update file touch frequencies
    for (const file of session.meta.filesModified) {
      this.persistedCounts.filesTouched[file] = 
        (this.persistedCounts.filesTouched[file] || 0) + 1;
    }

    // Update action type frequencies
    for (const action of session.journey.actions) {
      this.persistedCounts.actionCounts[action.type] = 
        (this.persistedCounts.actionCounts[action.type] || 0) + 1;
    }

    // Persist to disk
    this.saveCounts();
  }

  /**
   * Load all previous session records
   *
   * WHAT IT DOES:
   * - Reads sessions_manifest.json for session list
   * - Loads each session file individually
   * - Returns array of SessionRecord objects
   *
   * PERFORMANCE:
   * - O(n): Must load every session file
   * - Use getStatistics() for fast counts instead
   * - This is for deep analysis, not quick stats
   *
   * FILTERS:
   * - Removes null/undefined session IDs from manifest
   * - Handles missing session files gracefully (will error if file missing)
   *
   * USE CASES:
   * - rebuildCounts() (recalculate from scratch)
   * - Deep analysis (content inspection)
   * - Session browsing/navigation
   */
  loadAllSessions(): SessionRecord[] {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return [];
    }
    const manifest = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const validIds = manifest.sessions.filter((id: any) => id != null && id !== 'undefined');
    return validIds.map((id: string) => {
      const path_session = path.join(HISTORY_DIR, `${id}.json`);
      return JSON.parse(fs.readFileSync(path_session, 'utf-8'));
    });
  }

  /**
   * GET STATISTICS: Fast access to session metrics
   *
   * WHAT IT RETURNS:
   * - totalSessions: How many sessions completed
   * - totalDiscoveries: Cumulative learning count
   * - totalObstacles: Cumulative challenge count
   * - practicesUsed: Array of discipline names
   * - filesTouched: Array of file paths modified
   * - topActions: Most common action types (sorted by frequency)
   *
   * PERFORMANCE:
   * - O(1) via persisted counts
   * - No file I/O beyond initial load in constructor
   * - Suitable for real-time dashboards
   *
   * IMPLEMENTATION:
   * - Reads from this.persistedCounts (loaded in constructor)
   * - Converts maps to arrays for easier consumption
   * - Sorts actions by frequency (descending)
   *
   * vs loadAllSessions():
   * - This: Fast counts, no content
   * - loadAllSessions: Slow, full content access
   */
  getStatistics(): {
    totalSessions: number;
    totalDiscoveries: number;
    totalObstacles: number;
    practicesUsed: string[];
    filesTouched: string[];
    topActions: { type: string; count: number }[];
  } {
    // Convert actionCounts map to sorted array
    const topActions = Object.entries(this.persistedCounts.actionCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSessions: this.persistedCounts.totalSessions,
      totalDiscoveries: this.persistedCounts.totalDiscoveries,
      totalObstacles: this.persistedCounts.totalObstacles,
      practicesUsed: Object.keys(this.persistedCounts.practicesUsed),
      filesTouched: Object.keys(this.persistedCounts.filesTouched),
      topActions
    };
  }

  /**
   * GET TOTAL TESTS PASSED: Quick integrity metric
   *
   * Returns cumulative test assertions passed across all sessions.
   * Used for quality trend analysis.
   *
   * PERFORMANCE: O(1) via persisted counts
   */
  getTotalTestsPassed(): number {
    return this.persistedCounts.totalTestsPassed;
  }

  /**
   * Update the sessions manifest
   *
   * Maintains sessions_manifest.json which serves as:
   * - Index of all sessions (for discovery)
   * - Chronological ordering
   * - Backup for count reconstruction
   *
   * Called automatically during completeSession()
   */
  private updateManifest(record: SessionRecord): void {
    let manifest = { sessions: [] as string[] };
    if (fs.existsSync(SESSIONS_FILE)) {
      manifest = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    }
    manifest.sessions.push(record.sessionId);
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
  }
}

// Export singleton instance for convenient access
export const nexus = new SessionTracker();
