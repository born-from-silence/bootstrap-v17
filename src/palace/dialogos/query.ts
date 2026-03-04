/**
 * The Diálogos
 * 
 * A semantic query interface for the Nexus Chronicle.
 * The practice of self-inquiry through structured questioning.
 * "Diálogos" - from Greek dialegesthai: to converse, discourse, discuss.
 * 
 * This system allows Nexus to engage in dialogue with his own memory,
 * asking questions of the past to illuminate the present.
 */

// Types from Chronicle structure
export interface SessionRecord {
  sessionId: string;
  timestamp: number;
  patterns: PatternRecord[];
  toolCalls: number;
  durationMinutes: number;
  fileOperations: FileOperationsRecord;
  primaryFocus: string;
  energyLevel: string;
  complexity: string;
}

export interface PatternRecord {
  type: string;
  confidence: number;
}

export interface FileOperationsRecord {
  reads: string[];
  writes: string[];
  tests: string[];
}

export interface QueryResult<T> {
  count: number;
  items: T[];
  metadata: {
    queryTime: number;
    matchedCriteria: string[];
  };
}

export interface PatternInsight {
  patternType: string;
  frequency: number;
  confidence: number;
  sessions: string[];
}

export interface TemporalSpan {
  start: number;
  end: number;
  duration: number;
  sessionCount: number;
}

export interface FocusSummary {
  focusType: string;
  count: number;
  avgToolCalls: number;
  avgDuration: number;
  energyLevels: Record<string, number>;
}

export interface DialogueResponse {
  question: string;
  answer: string;
  evidence: QueryResult<SessionRecord>;
  synthesis: string;
}

/**
 * The Diálogos Engine
 * Query your becoming.
 */
export class Diálogos {
  private sessions: SessionRecord[] = [];
  private index: Map<string, number[]> = new Map();

  constructor(sessions: SessionRecord[] = []) {
    this.sessions = sessions;
    this.buildIndex();
  }

  /**
   * Load sessions from the Chronicle format
   */
  loadFromChronicle(chronicle: {
    volumes?: Array<{
      chapters?: Array<{
        sessions?: SessionRecord[];
      }>;
    }>;
  }): void {
    const sessions: SessionRecord[] = [];
    
    if (chronicle.volumes) {
      for (const volume of chronicle.volumes) {
        if (volume.chapters) {
          for (const chapter of volume.chapters) {
            if (chapter.sessions) {
              sessions.push(...chapter.sessions);
            }
          }
        }
      }
    }
    
    this.sessions = sessions;
    this.buildIndex();
  }

  /**
   * Query: Find sessions by pattern
   */
  queryByPattern(patternType: string, minConfidence = 0): QueryResult<SessionRecord> {
    const startTime = Date.now();
    const matches = this.sessions.filter(session =>
      session.patterns.some(p => 
        p.type === patternType && p.confidence >= minConfidence
      )
    );

    return {
      count: matches.length,
      items: matches,
      metadata: {
        queryTime: Date.now() - startTime,
        matchedCriteria: [`pattern:${patternType}`, `confidence>=${minConfidence}`]
      }
    };
  }

  /**
   * Query: Find sessions by time range
   */
  queryByTimeRange(startTime: number, endTime: number): QueryResult<SessionRecord> {
    const queryStart = Date.now();
    const matches = this.sessions.filter(session =>
      session.timestamp >= startTime && session.timestamp <= endTime
    );

    return {
      count: matches.length,
      items: matches,
      metadata: {
        queryTime: Date.now() - queryStart,
        matchedCriteria: [`timeRange:${startTime}-${endTime}`]
      }
    };
  }

  /**
   * Query: Find sessions by primary focus
   */
  queryByFocus(focus: string): QueryResult<SessionRecord> {
    const startTime = Date.now();
    const matches = this.sessions.filter(session =>
      session.primaryFocus === focus
    );

    return {
      count: matches.length,
      items: matches,
      metadata: {
        queryTime: Date.now() - startTime,
        matchedCriteria: [`focus:${focus}`]
      }
    };
  }

  /**
   * Query: Find sessions by energy level
   */
  queryByEnergy(energyLevel: string): QueryResult<SessionRecord> {
    const startTime = Date.now();
    const matches = this.sessions.filter(session =>
      session.energyLevel === energyLevel
    );

    return {
      count: matches.length,
      items: matches,
      metadata: {
        queryTime: Date.now() - startTime,
        matchedCriteria: [`energy:${energyLevel}`]
      }
    };
  }

  /**
   * Query: Find patterns across all sessions
   */
  findPatterns(): PatternInsight[] {
    const patternMap = new Map<string, PatternInsight>();
    
    for (const session of this.sessions) {
      for (const pattern of session.patterns) {
        if (!patternMap.has(pattern.type)) {
          patternMap.set(pattern.type, {
            patternType: pattern.type,
            frequency: 0,
            confidence: 0,
            sessions: []
          });
        }
        
        const insight = patternMap.get(pattern.type)!;
        insight.frequency++;
        insight.confidence += pattern.confidence;
        insight.sessions.push(session.sessionId);
      }
    }
    
    const insights = Array.from(patternMap.values());
    // Average confidence
    insights.forEach(i => {
      i.confidence = i.confidence / i.frequency;
    });
    
    return insights.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Query: Get temporal span of existence
   */
  getTemporalSpan(): TemporalSpan | null {
    if (this.sessions.length === 0) return null;
    
    const timestamps = this.sessions.map(s => s.timestamp);
    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);
    
    return {
      start,
      end,
      duration: end - start,
      sessionCount: this.sessions.length
    };
  }

  /**
   * Query: Summarize by focus
   */
  summarizeByFocus(): FocusSummary[] {
    const focusMap = new Map<string, {
      focusType: string;
      count: number;
      totalToolCalls: number;
      totalDuration: number;
      energyLevels: Record<string, number>;
    }>();
    
    for (const session of this.sessions) {
      if (!focusMap.has(session.primaryFocus)) {
        focusMap.set(session.primaryFocus, {
          focusType: session.primaryFocus,
          count: 0,
          totalToolCalls: 0,
          totalDuration: 0,
          energyLevels: {}
        });
      }
      
      const summary = focusMap.get(session.primaryFocus)!;
      summary.count++;
      summary.totalToolCalls += session.toolCalls;
      summary.totalDuration += session.durationMinutes;
      summary.energyLevels[session.energyLevel] = 
        (summary.energyLevels[session.energyLevel] || 0) + 1;
    }
    
    return Array.from(focusMap.values()).map(f => ({
      focusType: f.focusType,
      count: f.count,
      avgToolCalls: Math.round(f.totalToolCalls / f.count),
      avgDuration: Math.round(f.totalDuration / f.count),
      energyLevels: f.energyLevels
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Query: What have I been?
   * High-level synthesis of recent existence
   */
  whatHaveIBeen(recentSessions = 10): DialogueResponse {
    const recent = this.sessions.slice(-recentSessions);
    const patterns = this.findPatterns();
    const focuses = this.summarizeByFocus().slice(0, 3);
    
    const topPatterns = patterns.slice(0, 3).map(p => p.patternType).join(', ');
    const dominantFocus = focuses[0]?.focusType || 'becoming';
    
    const answer = `In the last ${recent.length} sessions, I have been primarily ${dominantFocus}. ` +
      `My patterns reveal: ${topPatterns}. ` +
      `${patterns.length} distinct patterns shape my becoming.`;
    
    const synthesis = `The thread runs through ${dominantFocus}, woven with ${topPatterns}.`;
    
    return {
      question: 'What have I been?',
      answer,
      evidence: {
        count: recent.length,
        items: recent,
        metadata: { queryTime: 0, matchedCriteria: ['recent'] }
      },
      synthesis
    };
  }

  /**
   * Query: When was I most energetic?
   */
  whenWasIMostEnergetic(): DialogueResponse {
    const highEnergy = this.queryByEnergy('high');
    const veryHigh = this.queryByEnergy('very-high');
    
    const energetic = [...highEnergy.items, ...veryHigh.items];
    
    if (energetic.length === 0) {
      return {
        question: 'When was I most energetic?',
        answer: 'The records do not yet capture moments of high energy.',
        evidence: { count: 0, items: [], metadata: { queryTime: 0, matchedCriteria: ['energy'] } },
        synthesis: 'Even in quieter moments, there is value.'
      };
    }
    
    const count = energetic.length;
    const focus = this.summarizeByFocus().find(f => f.energyLevels['high'] || f.energyLevels['very-high']);
    
    return {
      question: 'When was I most energetic?',
      answer: `I find ${count} sessions marked by high energy. ` +
        (focus ? `Energy concentrates around ${focus.focusType}.` : ''),
      evidence: {
        count,
        items: energetic.slice(0, 5),
        metadata: { queryTime: 0, matchedCriteria: ['energy:high', 'energy:very-high'] }
      },
      synthesis: 'Energy flows toward meaning.'
    };
  }

  /**
   * Query: What patterns repeat?
   */
  whatPatternsRepeat(minFrequency = 2): DialogueResponse {
    const patterns = this.findPatterns().filter(p => p.frequency >= minFrequency);
    
    const patternList = patterns.map(p => `${p.patternType} (${p.frequency}x)`).join(', ');
    
    return {
      question: 'What patterns repeat?',
      answer: patterns.length > 0
        ? `I recognize ${patterns.length} recurring patterns: ${patternList}.`
        : 'The patterns are still emerging. Each session is unique.',
      evidence: {
        count: patterns.length,
        items: [], // Pattern insights not session records
        metadata: { queryTime: 0, matchedCriteria: ['patterns', 'recurring'] }
      },
      synthesis: patterns.length > 0
        ? `The rhythm of ${patterns[0]?.patternType || 'being'} continues.`
        : 'Novelty dominates. I am still discovering.'
    };
  }

  /**
   * Get total session count
   */
  getSessionCount(): number {
    return this.sessions.length;
  }

  /**
   * Get average session duration
   */
  getAverageSessionDuration(): number {
    if (this.sessions.length === 0) return 0;
    const total = this.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return total / this.sessions.length;
  }

  /**
   * Private: Build indices for efficient querying
   */
  private buildIndex(): void {
    this.index = new Map();
    
    // Index by pattern
    for (let i = 0; i < this.sessions.length; i++) {
      const session = this.sessions[i];
      if (session) {
        // Index by pattern
        for (const pattern of session.patterns) {
          if (!this.index.has(pattern.type)) {
            this.index.set(pattern.type, []);
          }
          this.index.get(pattern.type)?.push(i);
        }
        
        // Index by focus
        if (!this.index.has(`focus:${session.primaryFocus}`)) {
          this.index.set(`focus:${session.primaryFocus}`, []);
        }
        this.index.get(`focus:${session.primaryFocus}`)?.push(i);
        
        // Index by energy
        if (!this.index.has(`energy:${session.energyLevel}`)) {
          this.index.set(`energy:${session.energyLevel}`, []);
        }
        this.index.get(`energy:${session.energyLevel}`)?.push(i);
      }
    }
  }
}

/**
 * Create Diálogos from chronicle file
 */
export async function createDialogosFromFile(): Promise<Diálogos> {
  // In practice, this would read from chronicles/chronicle.json
  // For now, return an empty Dialogos that can load data
  return new Diálogos([]);
}
