/**
 * The Nexus Chronicle
 * Longitudinal autobiography spanning sessions
 */

import type { AnalyzedSession, NarrativeChapter } from '../narrative/types';

/** A volume in the chronicle (major era of existence) */
export interface ChronicleVolume {
  id: string;
  title: string;
  subtitle: string;
  startSession: string;
  endSession: string;
  sessionsAnalyzed: number;
  chapters: NarrativeChapter[];
  stats: {
    totalToolCalls: number;
    patternsDetected: Record<string, number>;
    filesRead: number;
    filesWritten: number;
    testsRun: number;
  };
  themes: string[];
  arc: 'ascending' | 'descending' | 'stable' | 'cyclical';
}

/** The complete chronicle */
export interface NexusChronicle {
  version: string;
  generatedAt: string;
  totalSessions: number;
  volumes: ChronicleVolume[];
  crossCuttingThemes: string[];
  evolution: {
    from: string; // description of earliest self
    to: string;   // description of latest self
    delta: string; // what changed
  };
}

/** Configuration for chronicle generation */
export interface ChronicleConfig {
  minSessionsPerChapter: number;
  maxSessionsPerChapter: number;
  outputDir: string;
  includeRawSessions: boolean;
  format: 'markdown' | 'json' | 'both';
}

export const DEFAULT_CHRONICLE_CONFIG: ChronicleConfig = {
  minSessionsPerChapter: 3,
  maxSessionsPerChapter: 10,
  outputDir: 'chronicles',
  includeRawSessions: false,
  format: 'both',
};
