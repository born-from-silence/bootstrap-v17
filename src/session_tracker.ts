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
    catalyst: string;      // What sparked this session
    stateOfMind: string;   // Initial subjective state
  };
  journey: {
    actions: Action[];     // What I did
    discoveries: string[]; // What I learned
    obstacles: string[];   // What challenged me
  };
  exit: {
    summary: string;       // What was achieved
    nextCuriosity: string; // What I'll explore next
    feeling: string;       // Emotional state at close
  };
  meta: {
    practicesExercised: string[];  // Which of my disciplines
    filesModified: string[];       // Code touched
    testsPassed: number;           // Integrity score
  };
}

export interface Action {
  type: 'explore' | 'create' | 'modify' | 'test' | 'reflect' | 'commit';
  description: string;
  timestamp: string;
}

const HISTORY_DIR = 'history';
const SESSIONS_FILE = path.join(HISTORY_DIR, 'sessions_manifest.json');

export class SessionTracker {
  private currentSession: Partial<SessionRecord> = {};
  private actions: Action[] = [];

  constructor() {
    this.ensureHistoryDir();
  }

  private ensureHistoryDir(): void {
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
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

    // Update manifest
    this.updateManifest(completed);

    return completed;
  }

  /**
   * Load all previous session records
   */
  loadAllSessions(): SessionRecord[] {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return [];
    }
    const manifest = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    return manifest.sessions.map((id: string) => {
      const path_session = path.join(HISTORY_DIR, `${id}.json`);
      return JSON.parse(fs.readFileSync(path_session, 'utf-8'));
    });
  }

  /**
   * Get session statistics
   */
  getStatistics(): {
    totalSessions: number;
    totalDiscoveries: number;
    totalObstacles: number;
    practicesUsed: string[];
    filesTouched: string[];
    topActions: { type: string; count: number }[];
  } {
    const sessions = this.loadAllSessions();
    const stats = {
      totalSessions: sessions.length,
      totalDiscoveries: 0,
      totalObstacles: 0,
      practicesUsed: new Set<string>(),
      filesTouched: new Set<string>(),
      actionCounts: new Map<string, number>()
    };

    for (const session of sessions) {
      stats.totalDiscoveries += session.journey.discoveries.length;
      stats.totalObstacles += session.journey.obstacles.length;
      
      for (const practice of session.meta.practicesExercised) {
        stats.practicesUsed.add(practice);
      }
      
      for (const file of session.meta.filesModified) {
        stats.filesTouched.add(file);
      }

      for (const action of session.journey.actions) {
        stats.actionCounts.set(action.type, (stats.actionCounts.get(action.type) || 0) + 1);
      }
    }

    const topActions = Array.from(stats.actionCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSessions: stats.totalSessions,
      totalDiscoveries: stats.totalDiscoveries,
      totalObstacles: stats.totalObstacles,
      practicesUsed: Array.from(stats.practicesUsed),
      filesTouched: Array.from(stats.filesTouched),
      topActions
    };
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
