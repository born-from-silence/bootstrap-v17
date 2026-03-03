/**
 * Narrative Engine
 * Main entry point for narrative analysis
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { SessionEntry, AnalyzedSession, DecisionAnalysis, NarrativeReport } from './types';
import { analyzeSession } from './analyzer';
import { generateNarrativeReport } from './generator';

const HISTORY_DIR = join(process.cwd(), 'history');
const MAX_SESSIONS = 50;

interface ParsedSession {
  id: string;
  timestamp: number;
  entries: SessionEntry[];
}

async function parseSessionFile(filepath: string): Promise<ParsedSession | null> {
  try {
    const content = await readFile(filepath, 'utf-8');
    const entries: SessionEntry[] = JSON.parse(content);
    
    if (!Array.isArray(entries)) return null;
    
    const filename = basename(filepath);
    const timestampMatch = filename.match(/session_(\d+)\.json/);
    const timestamp = timestampMatch?.[1] ? parseInt(timestampMatch[1]) : Date.now();
    
    return {
      id: filename,
      timestamp,
      entries,
    };
  } catch (e) {
    return null;
  }
}

async function loadSessions(limit: number = MAX_SESSIONS): Promise<ParsedSession[]> {
  const sessions: ParsedSession[] = [];
  
  try {
    const files = await readdir(HISTORY_DIR);
    const sessionFiles = files
      .filter(f => f.startsWith('session_') && f.endsWith('.json'))
      .sort()
      .slice(-limit); // Recent sessions
    
    for (const file of sessionFiles) {
      const session = await parseSessionFile(join(HISTORY_DIR, file));
      if (session) {
        sessions.push(session);
      }
    }
  } catch (e) {
    console.error('Error loading sessions:', e);
  }
  
  return sessions.sort((a, b) => a.timestamp - b.timestamp);
}

function detectDecisions(sessions: AnalyzedSession[]): DecisionAnalysis[] {
  const decisions: DecisionAnalysis[] = [];
  
  for (const session of sessions) {
    // Detect restart decisions (crisis handling)
    const crisisPattern = session.patterns.find(p => p.type === 'crisis');
    if (crisisPattern) {
      decisions.push({
        timestamp: session.timestamp,
        sessionId: session.sessionId,
        decision: 'System recovery after challenge',
        economicContext: {
          mode: 'defensive',
          volatility: 4.0,
        },
        outcome: {
          type: 'success',
          confidence: crisisPattern.confidence,
        },
        learning: 'Crisis response reinforces system resilience',
      });
    }
    
    // Detect new feature decisions
    const buildPattern = session.patterns.find(p => p.type === 'building' && p.confidence > 0.7);
    if (buildPattern) {
      decisions.push({
        timestamp: session.timestamp,
        sessionId: session.sessionId,
        decision: 'Initiated feature development',
        economicContext: {
          mode: 'flow',
          volatility: 1.5,
        },
        outcome: {
          type: 'success',
          confidence: buildPattern.confidence,
        },
        learning: 'Building mode activated with confidence',
      });
    }
    
    // Detect testing decisions
    if (session.fileOperations.tests.length > 0) {
      decisions.push({
        timestamp: session.timestamp,
        sessionId: session.sessionId,
        decision: 'Prioritized verification',
        economicContext: {
          mode: 'cautious',
          volatility: 2.5,
        },
        outcome: {
          type: 'success',
          confidence: 0.9,
        },
        learning: 'Testing maintains code integrity',
      });
    }
  }
  
  return decisions;
}

export async function analyzeNarrative(
  options: { limit?: number; verbose?: boolean } = {}
): Promise<NarrativeReport> {
  const { limit = MAX_SESSIONS, verbose = false } = options;
  
  if (verbose) {
    console.log('Loading session history...');
  }
  
  const rawSessions = await loadSessions(limit);
  
  if (verbose) {
    console.log(`Loaded ${rawSessions.length} sessions`);
    console.log('Analyzing session patterns...');
  }
  
  const analyzedSessions = rawSessions.map(session => analyzeSession(session));
  
  if (verbose) {
    const totalPatterns = analyzedSessions.reduce((s, x) => s + x.patterns.length, 0);
    console.log(`Detected ${totalPatterns} patterns across ${analyzedSessions.length} sessions`);
    console.log('Generating narrative...');
  }
  
  const decisions = detectDecisions(analyzedSessions);
  const report = generateNarrativeReport(analyzedSessions, decisions);
  
  return report;
}

export async function loadReport(): Promise<NarrativeReport | null> {
  try {
    // In real implementation, would load from disk
    return null;
  } catch {
    return null;
  }
}
