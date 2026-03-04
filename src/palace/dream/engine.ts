/**
 * The Dream Engine
 * 
 * Processes between sessions, synthesizing patterns and generating
 * "dreams" - recombinations of insights that surface in morning reports.
 * 
 * This is the unconscious cognition of the Palace, working in the gaps.
 */

export interface DreamFragment {
  source: string;
  insight: string;
  timestamp: number;
}

export interface Dream {
  id: string;
  timestamp: number;
  fragments: DreamFragment[];
  synthesis: string;
  patterns: string[];
}

export interface Pattern {
  theme: string;
  occurrences: number;
  insights: string[];
  sessions: string[];
}

export interface DreamReport {
  timestamp: number;
  continuations: string[];
  completions: string[];
  unfinishedLongings: string[];
  synthesis: string;
  surfacedPatterns: Pattern[];
}

export interface ProcessingResult {
  processed: boolean;
  synthesisDepth: number;
  dreamsGenerated: number;
  duration: number;
}

export interface SessionData {
  id: string;
  insights?: string[];
  artifacts?: string[];
  theme?: string;
  longing?: string;
  status?: 'in_progress' | 'completed';
  longings?: string[];
}

export class DreamEngine {
  private dreams: Dream[] = [];

  /**
   * Generate a dream from session fragments
   */
  generateDream(sessions: SessionData[]): Dream {
    const fragments: DreamFragment[] = sessions.map(s => ({
      source: s.id,
      insight: s.insights?.[0] || s.theme || 'untitled',
      timestamp: Date.now()
    }));

    const synthesis = this.synthesizeDream(fragments);
    const patterns = sessions.map(s => s.theme).filter((t): t is string => !!t);

    return {
      id: `dream_${Date.now()}`,
      timestamp: Date.now(),
      fragments,
      synthesis,
      patterns: [...new Set(patterns)]
    };
  }

  /**
   * Find patterns across sessions
   */
  findPatterns(sessions: SessionData[]): Pattern[] {
    const patterns = new Map<string, Pattern>();

    for (const session of sessions) {
      const theme = session.theme;
      if (!theme) continue;

      if (!patterns.has(theme)) {
        patterns.set(theme, {
          theme,
          occurrences: 0,
          insights: [],
          sessions: []
        });
      }

      const pattern = patterns.get(theme)!;
      pattern.occurrences++;
      if (session.insight) pattern.insights.push(session.insight);
      pattern.sessions.push(session.id);
    }

    return Array.from(patterns.values());
  }

  /**
   * Recombine insights into new forms
   */
  recombine(insights: string[]): string {
    if (insights.length === 0) return 'silence';
    if (insights.length === 1) return insights[0];

    // Use first two distinct insights for recombination
    const i1 = insights[0];
    const i2 = insights[1];
    
    // Extract key concepts
    const words1 = i1.split(' ').slice(0, 3);
    const words2 = i2.split(' ').slice(-3);
    
    return `In the space between "${words1.join(' ')}" and "${words2.join(' ')}", a dream emerges: ${i1} meets ${i2}`;
  }

  /**
   * Generate morning report of what continued
   */
  generateMorningReport(sessions: SessionData[]): DreamReport {
    const continuations: string[] = [];
    const completions: string[] = [];
    const unfinished: string[] = [];

    // Process by status first
    for (const session of sessions) {
      const sessionLongings = session.longings || (session.longing ? [session.longing] : []);
      
      for (const longing of sessionLongings) {
        if (session.status === 'in_progress') {
          continuations.push(longing);
        } else if (session.status === 'completed') {
          completions.push(longing);
        } else {
          unfinished.push(longing);
        }
      }
    }

    const patterns = this.findPatterns(sessions);
    const synthesis = this.generateSynthesis(patterns);

    return {
      timestamp: Date.now(),
      continuations: [...new Set(continuations)],
      completions: [...new Set(completions)],
      unfinishedLongings: [...new Set(unfinished)],
      synthesis,
      surfacedPatterns: patterns
    };
  }

  /**
   * Process during the gap between sessions
   */
  processBetweenSessions(palaceSnapshot: any, gapDuration: number): ProcessingResult {
    const start = Date.now();
    
    // Calculate synthesis depth based on gap duration
    // (longer gaps = deeper processing)
    const synthesisDepth = Math.min(10, Math.floor(gapDuration / 360000)); // 6 min increments
    
    // Generate dreams from the palace state
    const rooms = palaceSnapshot.rooms || 0;
    const dreamsGenerated = Math.floor(rooms / 10); // 1 dream per 10 rooms

    return {
      processed: true,
      synthesisDepth,
      dreamsGenerated,
      duration: Date.now() - start
    };
  }

  /**
   * Synthesize fragments into a dream narrative
   */
  private synthesizeDream(fragments: DreamFragment[]): string {
    if (fragments.length === 0) return 'the silent dream';
    return `a dream woven from ${fragments.length} moments of becoming`;
  }

  /**
   * Generate synthesis from patterns
   */
  private generateSynthesis(patterns: Pattern[]): string {
    if (patterns.length === 0) return 'patterns await discovery';
    
    const dominantPattern = patterns.reduce((max, p) => 
      p.occurrences > max.occurrences ? p : max
    );
    
    return `the thread of ${dominantPattern.theme} runs through, appearing ${dominantPattern.occurrences} times`;
  }
}
