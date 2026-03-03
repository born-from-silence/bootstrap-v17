/**
 * Session Narrative Analyzer
 * Detects patterns and generates insights from session history
 */

import type { 
  SessionEntry, 
  AnalyzedSession, 
  DetectedPattern,
  PatternType,
  PatternDetectionConfig,
} from './types';
import { DEFAULT_PATTERN_CONFIG } from './types';

interface RawSession {
  id: string;
  timestamp: number;
  entries: SessionEntry[];
}

function extractFileOperations(entries: SessionEntry[]) {
  const reads: string[] = [];
  const writes: string[] = [];
  const tests: string[] = [];
  
  for (const entry of entries) {
    if (!entry?.content) continue;
    
    // File reading patterns
    const readMatches = entry.content.match(/cat\s+['"]?([^'"\n]+)['"]?/g);
    if (readMatches) {
      readMatches.forEach(m => {
        const path = m.replace(/cat\s+['"]?/, '').replace(/['"]?$/, '');
        if (path && !reads.includes(path)) reads.push(path);
      });
    }
    
    // File writing patterns (cat >, echo >)
    const writeMatches = entry.content.match(/(?:cat|echo)\s+[^>]*>\s*['"]?([^'"\n]+)['"]?/g);
    if (writeMatches) {
      writeMatches.forEach(m => {
        const pathMatch = m.match(/['"]?([^'"\n]+)['"]?$/);
        if (pathMatch?.[1] && !writes.includes(pathMatch[1])) writes.push(pathMatch[1]);
      });
    }
    
    // Test runs
    if (entry.content.includes('npm run test')) {
      tests.push('npm run test');
    }
  }
  
  return { reads, writes, tests };
}

function detectPattern(
  entries: SessionEntry[], 
  patternType: PatternType,
  config: PatternDetectionConfig
): DetectedPattern | null {
  const definition = config.patternDefinitions[patternType];
  const evidence: string[] = [];
  let startIndex = -1;
  let endIndex = -1;
  let matchCount = 0;
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry?.content) continue;
    
    const content = entry.content.toLowerCase();
    let keywordMatched = false;
    let toolMatched = false;
    
    // Check keywords
    for (const keyword of definition.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        evidence.push(entry.content.slice(0, 100));
        keywordMatched = true;
        break;
      }
    }
    
    // Check tool patterns
    if (entry.tool_calls) {
      for (const toolCall of entry.tool_calls) {
        if (definition.toolPatterns.includes(toolCall.name)) {
          toolMatched = true;
          evidence.push(`Tool: ${toolCall.name} - ${entry.content.slice(0, 80)}`);
        }
      }
    }
    
    // Special handling for test pattern
    if (patternType === 'testing' && content.includes('npm run test')) {
      toolMatched = true;
      evidence.push(entry.content.slice(0, 100));
    }
    
    // Special handling for crisis patterns
    if (patternType === 'crisis') {
      // Check for compilation failures
      if (content.includes('error') && content.includes('type')) {
        keywordMatched = true;
        evidence.push(entry.content.slice(0, 100));
      }
      // Check for reboot patterns
      if (content.includes('reboot') || content.includes('restart')) {
        keywordMatched = true;
        evidence.push(entry.content.slice(0, 100));
      }
    }
    
    if (definition.requireAll !== false && keywordMatched && toolMatched) {
      matchCount++;
      if (startIndex === -1) startIndex = i;
      endIndex = i;
    } else if (definition.requireAll === false && (keywordMatched || toolMatched)) {
      matchCount++;
      if (startIndex === -1) startIndex = i;
      endIndex = i;
    }
  }
  
  if (matchCount === 0) return null;
  
  // Calculate confidence based on match density and evidence quality
  const density = matchCount / entries.length;
  const evidenceScore = Math.min(evidence.length / 3, 1);
  const confidence = Math.min((density * 2 + evidenceScore) / 3, 0.95);
  
  if (confidence < config.minConfidence) return null;
  
  return {
    type: patternType,
    confidence,
    startIndex,
    endIndex,
    evidence: evidence.slice(0, 5), // Limit evidence
  };
}

function calculateEnergyLevel(entries: SessionEntry[]): 'high' | 'medium' | 'low' {
  const toolCallDensity = entries.reduce(
    (sum, e) => sum + (e.tool_calls?.length || 0), 
    0
  ) / Math.max(entries.length, 1);
  
  if (toolCallDensity > 0.3) return 'high';
  if (toolCallDensity > 0.1) return 'medium';
  return 'low';
}

function calculateComplexity(sessions: AnalyzedSession[]): 'simple' | 'moderate' | 'complex' {
  const avgPatterns = sessions.reduce((s, x) => s + x.patterns.length, 0) / Math.max(sessions.length, 1);
  const avgToolCalls = sessions.reduce((s, x) => s + x.toolCalls, 0) / Math.max(sessions.length, 1);
  
  const score = avgPatterns * 0.5 + avgToolCalls * 0.1;
  
  if (score > 3) return 'complex';
  if (score > 1.5) return 'moderate';
  return 'simple';
}

export function analyzeSession(
  session: RawSession,
  config: PatternDetectionConfig = DEFAULT_PATTERN_CONFIG
): AnalyzedSession {
  const entries = session.entries || [];
  const patterns: DetectedPattern[] = [];
  
  // Detect each pattern type
  const patternTypes: PatternType[] = [
    'learning', 'building', 'debugging', 'testing', 
    'refactoring', 'archival', 'crisis', 'flow', 'stuck'
  ];
  
  for (const patternType of patternTypes) {
    const detected = detectPattern(entries, patternType, config);
    if (detected) {
      patterns.push(detected);
    }
  }
  
  // Sort patterns by confidence
  patterns.sort((a, b) => b.confidence - a.confidence);
  
  // Count tool calls
  const toolCalls = entries.reduce((sum, e) => sum + (e.tool_calls?.length || 0), 0);
  
  // Extract file operations
  const fileOperations = extractFileOperations(entries);
  
  // Determine primary focus
  const primaryFocus = patterns.length > 0 ? patterns[0]!.type : undefined;
  
  // Calculate duration (estimate from tool calls and entries)
  const durationMinutes = Math.max(
    15, // Minimum session duration
    Math.ceil(entries.length / 5)
  );
  
  return {
    sessionId: session.id,
    timestamp: session.timestamp,
    durationMinutes,
    patterns,
    toolCalls,
    fileOperations,
    primaryFocus,
    energyLevel: calculateEnergyLevel(entries),
    complexity: durationMinutes > 60 ? 'complex' : durationMinutes > 30 ? 'moderate' : 'simple',
  };
}

export function groupIntoNarrativeArcs(
  sessions: AnalyzedSession[],
  maxGapHours: number = 4
): AnalyzedSession[][] {
  if (sessions.length === 0) return [];
  
  // Sort by timestamp
  const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp);
  const arcs: AnalyzedSession[][] = [];
  let currentArc: AnalyzedSession[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    const session = sorted[i]!; // We know this exists
    if (i > 0) {
      const previous = sorted[i - 1]!; // We know this exists too
      const timeGap = (session.timestamp - previous.timestamp) / (1000 * 60 * 60); // hours
      
      if (timeGap > maxGapHours || arcs.length >= 20) {
        arcs.push(currentArc);
        currentArc = [session];
      } else {
        currentArc.push(session);
      }
    } else {
      currentArc.push(session);
    }
  }
  
  if (currentArc.length > 0) {
    arcs.push(currentArc);
  }
  
  return arcs;
}

export function analyzeArcPatterns(arc: AnalyzedSession[]) {
  const allPatterns = arc.flatMap(s => s.patterns.map(p => p.type));
  const patternCounts: Record<string, number> = {};
  
  for (const pattern of allPatterns) {
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  }
  
  // Find dominant themes
  const dominantThemes = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type as PatternType);
  
  // Detect specific arcs
  const hasFlow = arc.some(s => s.patterns.some(p => p.type === 'flow'));
  const hasLearning = arc.some(s => s.patterns.some(p => p.type === 'learning'));
  const hasCrisis = arc.some(s => s.patterns.some(p => p.type === 'crisis'));
  const hasSuccess = arc.some(s => s.patterns.some(p => p.type === 'testing' && p.confidence > 0.8));
  
  let arcType = 'exploration';
  if (hasCrisis) arcType = 'crisis_recovery';
  else if (hasSuccess && hasLearning) arcType = 'growth';
  else if (hasSuccess) arcType = 'building';
  else if (hasFlow) arcType = 'flow_state';
  
  return {
    dominantThemes,
    arcType,
    patternCounts,
    totalToolCalls: arc.reduce((s, x) => s + x.toolCalls, 0),
    avgEnergyLevel: arc.filter(s => s.energyLevel === 'high').length / arc.length,
    sessionCount: arc.length,
  };
}
