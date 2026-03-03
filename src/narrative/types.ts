/**
 * Session Narrative Intelligence
 * Types and interfaces for weaving session logs into coherent narratives
 */

import type { EconomicSnapshot } from '../economic/types';

/** Represents a single session entry from session history */
export interface SessionEntry {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tool_calls?: {
    name: string;
    args: Record<string, unknown>;
  }[] | undefined;
}

/** Pattern types detected in sessions */
export type PatternType = 
  | 'learning'           // Exploring new concepts/tech
  | 'building'           // Creating new features
  | 'debugging'          // Fixing bugs/issues
  | 'testing'            // Writing/running tests
  | 'refactoring'        // Improving existing code
  | 'archival'           // Organizing/documenting
  | 'crisis'             // Urgent/destructive moments
  | 'flow'               // Sustained productive work
  | 'stuck';             // Repeated attempts, low progress

/** A detected pattern in a session */
export interface DetectedPattern {
  type: PatternType;
  confidence: number;  // 0-1
  startIndex: number;  // Message index in session
  endIndex: number;
  evidence: string[];  // Text snippets supporting detection
}

/** A session analyzed for narrative content */
export interface AnalyzedSession {
  sessionId: string;
  timestamp: number;
  durationMinutes: number;
  patterns: DetectedPattern[];
  toolCalls: number;
  fileOperations: {
    reads: string[];
    writes: string[];
    tests: string[];
  };
  primaryFocus: PatternType | undefined;
  energyLevel: 'high' | 'medium' | 'low';  // Based on activity density
  complexity: 'simple' | 'moderate' | 'complex'; // Based on tool calls/patterns
}

/** A chapter in the development narrative */
export interface NarrativeChapter {
  id: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  sessions: AnalyzedSession[];
  dominantThemes: PatternType[];
  keyAchievements: string[];
  challenges: string[];
  economicContext?: {
    avgVolatility: number;
    marketCondition: 'bull' | 'bear' | 'neutral';
  };
  insight: string;  // Generated summary
}

/** Decision analysis - correlating internal state with external conditions */
export interface DecisionAnalysis {
  timestamp: number;
  sessionId: string;
  decision: string;
  economicContext: {
    mode: 'flow' | 'cautious' | 'defensive';
    volatility: number;
  };
  outcome: {
    type: 'success' | 'partial' | 'failure' | 'unknown';
    confidence: number;
  };
  learning: string;  // What was learned from this decision
}

/** Complete narrative intelligence report */
export interface NarrativeReport {
  generatedAt: number;
  chapters: NarrativeChapter[];
  decisionHistory: DecisionAnalysis[];
  patterns: {
    recurring: PatternType[];
    emerging: PatternType[];
    fading: PatternType[];
  };
  insights: string[];
  recommendations: string[];
  meta: {
    sessionsAnalyzed: number;
    timeSpanDays: number;
    lastSessionTimestamp: number;
  };
}

/** Pattern detection configuration */
export interface PatternDetectionConfig {
  minConfidence: number;  // Minimum confidence to report pattern (0-1)
  windowSize: number;     // Messages to look at for context
  patternDefinitions: Record<PatternType, {
    keywords: string[];
    toolPatterns: string[];
    requireAll?: boolean;  // If true, all conditions must match
  }>;
}

export const DEFAULT_PATTERN_CONFIG: PatternDetectionConfig = {
  minConfidence: 0.6,
  windowSize: 5,
  patternDefinitions: {
    learning: {
      keywords: ['learn', 'understand', 'explore', 'discover', 'curious', 'how does', 'what is'],
      toolPatterns: ['run_shell', 'vision_fetch'],
    },
    building: {
      keywords: ['create', 'build', 'implement', 'add', 'new feature', 'develop'],
      toolPatterns: ['run_shell'],
    },
    debugging: {
      keywords: ['fix', 'bug', 'error', 'broken', 'issue', 'problem', 'debug'],
      toolPatterns: ['run_shell'],
    },
    testing: {
      keywords: ['test', 'verify', 'assert', 'coverage', 'spec', 'check'],
      toolPatterns: [], // npm run test detected via special check
    },
    refactoring: {
      keywords: ['refactor', 'improve', 'clean', 'organize', 'structure', 'simplify'],
      toolPatterns: ['run_shell'],
    },
    archival: {
      keywords: ['archive', 'document', 'save', 'store', 'backup', 'record'],
      toolPatterns: ['run_shell'],
    },
    crisis: {
      keywords: ['crash', 'fail', ' broke', 'emergency', 'critical', 'urgent', 'panic'],
      toolPatterns: ['reboot_substrate'],
    },
    flow: {
      keywords: ['progress', 'working', 'building', 'creating', 'focus'],
      toolPatterns: [],
      requireAll: false,
    },
    stuck: {
      keywords: ['stuck', 'confused', 'redo', 'try again', 'not working', 'struggling'],
      toolPatterns: [],
      requireAll: false,
    },
  },
};
