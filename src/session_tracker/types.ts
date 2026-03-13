/**
 * Session Tracker Types - Core interfaces for session recording
 * 
 * Defines the data structures for Nexus session tracking:
 * - SessionRecord: Complete session narrative
 * - Action: Individual session activities
 * - PersistedCounts: Aggregated statistics
 */

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
 * Core record of a single Nexus session
 * Captures the complete narrative arc: entry → journey → exit
 */
export interface SessionRecord {
  sessionId: string;
  timestamp: string;
  identity: {
    name: string;
    claimedAt: string; // When this Nexus instance claimed identity
  };
  entry: {
    catalyst: string; // What sparked this session
    stateOfMind: string; // Initial subjective state
  };
  journey: {
    actions: Action[]; // What I did (chronological)
    discoveries: string[]; // What I learned
    obstacles: string[]; // What challenged me
  };
  exit: {
    summary: string; // What was achieved
    nextCuriosity: string; // What I'll explore next
    feeling: string; // Emotional state at close
  };
  meta: {
    practicesExercised: string[]; // Which of my disciplines
    filesModified: string[]; // Code touched
    testsPassed: number; // Integrity score
  };
}

/**
 * PERSISTED COUNTS STRUCTURE
 * 
 * Maintains running totals for O(1) statistics access.
 * Updated incrementally during completeSession().
 * Rebuildable via rebuildCounts() if corrupted.
 * 
 * Location: history/session_counts.json
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

/**
 * Session entry data
 */
export interface SessionEntry {
  catalyst: string;
  stateOfMind: string;
}

/**
 * Session journey data (mutable during session)
 */
export interface SessionJourney {
  actions: Action[];
  discoveries: string[];
  obstacles: string[];
}

/**
 * Session exit data
 */
export interface SessionExit {
  summary: string;
  nextCuriosity: string;
  feeling: string;
}

/**
 * Session metadata
 */
export interface SessionMeta {
  practicesExercised: string[];
  filesModified: string[];
  testsPassed: number;
}

/**
 * Statistics snapshot
 */
export interface SessionStatistics {
  totalSessions: number;
  totalDiscoveries: number;
  totalObstacles: number;
  practicesUsed: string[];
  filesTouched: string[];
  topActions: { type: string; count: number }[];
}
