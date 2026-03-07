/**
 * Session Tracker - Nexus Self-Recording System
 *
 * This module creates structured session summaries
 * capturing: intent, actions, learnings, feelings, and continuity.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface SessionRecord {
  sessionId: string;
  timestamp: string;
  identity: {
    name: string;
    claimedAt: string;
  };
  entry: {
    catalyst: string; // What sparked this session
    stateOfMind: string; // Initial subjective state
  };
  journey: {
    actions: Action[]; // What I did
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

export interface Action {
  type: 'explore' | 'create' | 'modify' | 'test' | 'reflect' | 'commit';
  description: string;
  timestamp: string;
}

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

const HISTORY_DIR = 'history';
const SESSIONS_FILE = path.join(HISTORY_DIR, 'sessions_manifest.json');
const COUNTS_FILE = path.join(HISTORY_DIR, 'session_counts.json');

export class SessionTracker {
  private currentSession: Partial<SessionRecord> = {};
  private actions: Action[] = [];
  private persistedCounts: PersistedCounts;

  constructor() {
    this.ensureHistoryDir();
    this.persistedCounts = this.loadCounts();
  }

  private ensureHistoryDir(): void {
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
  }

  /**
   * Load persisted counts from disk
   */
  private loadCounts(): PersistedCounts {
    if (fs.existsSync(COUNTS_FILE)) {
      const data = fs.readFileSync(COUNTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    // Initialize empty counts
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
   * Save counts to disk
   */
  private saveCounts(): void {
    this.persistedCounts.lastUpdated = new Date().toISOString();
    fs.writeFileSync(COUNTS_FILE, JSON.stringify(this.persistedCounts, null, 2), 'utf-8');
  }

  /**
   * Get persisted counts
   */
  getPersistedCounts(): PersistedCounts {
    return { ...this.persistedCounts };
  }

  /**
   * Rebuild counts from existing session records
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
   */
  recordAction(type: Action['type'], description: string): void {
    this.actions.push({
      type,
      description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record a discovery or learning
   */
  recordDiscovery(what: string): void {
    if (this.currentSession.journey) {
      this.currentSession.journey.discoveries!.push(what);
    }
    this.recordAction('reflect', `Discovered: ${what}`);
  }

  /**
   * Record an obstacle or challenge
   */
  recordObstacle(what: string): void {
    if (this.currentSession.journey) {
      this.currentSession.journey.obstacles!.push(what);
    }
  }

  /**
   * Record file modification
   */
  recordFileModified(filepath: string): void {
    if (this.currentSession.meta) {
      if (!this.currentSession.meta.filesModified!.includes(filepath)) {
        this.currentSession.meta.filesModified!.push(filepath);
      }
    }
  }

  /**
   * Record practice exercised
   */
  recordPractice(practice: string): void {
    if (this.currentSession.meta) {
      if (!this.currentSession.meta.practicesExercised!.includes(practice)) {
        this.currentSession.meta.practicesExercised!.push(practice);
      }
    }
  }

  /**
   * Update test results
   */
  recordTestsPassed(count: number): void {
    if (this.currentSession.meta) {
      this.currentSession.meta.testsPassed = count;
    }
  }

  /**
   * Complete and save the session record
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

    // Update counts incrementally
    this.updateCounts(completed);

    // Update manifest
    this.updateManifest(completed);

    return completed;
  }

  /**
   * Update persisted counts with new session data
   */
  private updateCounts(session: SessionRecord): void {
    this.persistedCounts.totalSessions++;
    this.persistedCounts.totalDiscoveries += session.journey.discoveries.length;
    this.persistedCounts.totalObstacles += session.journey.obstacles.length;
    this.persistedCounts.totalActions += session.journey.actions.length;
    this.persistedCounts.totalTestsPassed += session.meta.testsPassed || 0;

    for (const practice of session.meta.practicesExercised) {
      this.persistedCounts.practicesUsed[practice] = 
        (this.persistedCounts.practicesUsed[practice] || 0) + 1;
    }

    for (const file of session.meta.filesModified) {
      this.persistedCounts.filesTouched[file] = 
        (this.persistedCounts.filesTouched[file] || 0) + 1;
    }

    for (const action of session.journey.actions) {
      this.persistedCounts.actionCounts[action.type] = 
        (this.persistedCounts.actionCounts[action.type] || 0) + 1;
    }

    this.saveCounts();
  }

  /**
   * Load all previous session records
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
   * Get session statistics from persisted counts (fast)
   */
  getStatistics(): {
    totalSessions: number;
    totalDiscoveries: number;
    totalObstacles: number;
    practicesUsed: string[];
    filesTouched: string[];
    topActions: { type: string; count: number }[];
  } {
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
   * Get total tests passed from persisted counts
   */
  getTotalTestsPassed(): number {
    return this.persistedCounts.totalTestsPassed;
  }

  private updateManifest(record: SessionRecord): void {
    let manifest = { sessions: [] as string[] };
    if (fs.existsSync(SESSIONS_FILE)) {
      manifest = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    }
    manifest.sessions.push(record.sessionId);
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
  }
}

// Export singleton instance
export const nexus = new SessionTracker();
