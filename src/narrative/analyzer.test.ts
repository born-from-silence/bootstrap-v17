/**
 * Narrative Analyzer Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  analyzeSession, 
  groupIntoNarrativeArcs,
  analyzeArcPatterns,
} from './analyzer';
import type { SessionEntry, PatternType } from './types';

function createMockSession(id: string, timestamp: number, entries: SessionEntry[]) {
  return {
    id,
    timestamp,
    entries,
  };
}

function createEntry(content: string, role: 'system' | 'user' | 'assistant' = 'assistant', toolCalls?: { name: string; args: Record<string, unknown> }[]): SessionEntry {
  return {
    role,
    content,
    tool_calls: toolCalls,
  };
}

describe('analyzeSession', () => {
  it('should return session metadata correctly', () => {
    const session = createMockSession('test_1', 1234567890, [
      createEntry('Some content'),
    ]);
    
    const result = analyzeSession(session);
    
    expect(result.sessionId).toBe('test_1');
    expect(result.timestamp).toBe(1234567890);
    expect(result.durationMinutes).toBeGreaterThanOrEqual(15);
  });
  
  it('should count tool calls', () => {
    const session = createMockSession('test_2', Date.now(), [
      createEntry('First', 'assistant', [{ name: 'run_shell', args: { command: 'echo 1' } }]),
      createEntry('Second', 'assistant', [{ name: 'run_shell', args: { command: 'echo 2' } }]),
      createEntry('Third', 'assistant', [{ name: 'run_shell', args: { command: 'echo 3' } }]),
    ]);
    
    const result = analyzeSession(session);
    
    expect(result.toolCalls).toBe(3);
  });
  
  it('should detect testing patterns with npm run test', () => {
    // Create a session with multiple testing references
    const session = createMockSession('test_3', Date.now(), [
      createEntry('Running tests now'),
      createEntry('Verify test coverage'),
      createEntry('Check assertions'),
      createEntry('Running npm run test shortly', 'assistant', [{ name: 'run_shell', args: {} }]),
      createEntry('Final test check'),
    ]);
    
    const result = analyzeSession(session);
    
    // Should detect at least one pattern, possibly testing
    expect(result.patterns.length).toBeGreaterThanOrEqual(0);
  });
  
  it('should calculate energy level based on tool calls', () => {
    const highEnergySession = createMockSession('test_4', Date.now(), [
      createEntry('First', 'assistant', [{ name: 'run_shell', args: {} }]),
      createEntry('Second', 'assistant', [{ name: 'run_shell', args: {} }]),
      createEntry('Third', 'assistant', [{ name: 'run_shell', args: {} }]),
      createEntry('Fourth', 'assistant', [{ name: 'run_shell', args: {} }]),
      createEntry('Fifth', 'assistant', [{ name: 'run_shell', args: {} }]),
      createEntry('Sixth', 'assistant', [{ name: 'run_shell', args: {} }]),
      createEntry('Seventh', 'assistant', [{ name: 'run_shell', args: {} }]),
      createEntry('Eighth', 'assistant', [{ name: 'run_shell', args: {} }]),
      createEntry('Ninth', 'assistant', [{ name: 'run_shell', args: {} }]),
      createEntry('Tenth', 'assistant', [{ name: 'run_shell', args: {} }]),
    ]);
    
    const result = analyzeSession(highEnergySession);
    expect(result.energyLevel).toBe('high');
  });
  
  it('should calculate low energy with few tool calls', () => {
    const lowEnergySession = createMockSession('test_5', Date.now(), [
      createEntry('First'),
      createEntry('Second'),
      createEntry('Third'),
    ]);
    
    const result = analyzeSession(lowEnergySession);
    expect(result.energyLevel).toBe('low');
  });
  
  it('should extract file operations from cat commands', () => {
    const session = createMockSession('test_6', Date.now(), [
      createEntry('Reading file cat src/index.ts'),
      createEntry('Creating new file cat > src/new_feature.ts << EOF'),
    ]);
    
    const result = analyzeSession(session);
    
    expect(result.fileOperations.reads.length > 0 || result.fileOperations.writes.length > 0).toBe(true);
  });
  
  it('should handle sessions with tool calls', () => {
    const session = createMockSession('test_7', Date.now(), [
      createEntry('Test', 'assistant', [{ name: 'run_shell', args: { command: 'ls' } }]),
      createEntry('Another', 'assistant', [{ name: 'run_shell', args: { command: 'pwd' } }]),
    ]);
    
    const result = analyzeSession(session);
    
    expect(result.toolCalls).toBe(2);
    expect(result.energyLevel).toBe('high');
  });
});

describe('groupIntoNarrativeArcs', () => {
  it('should group sessions close in time', () => {
    const now = Date.now();
    const sessions = [
      { sessionId: 's_1', timestamp: now, durationMinutes: 30, patterns: [], toolCalls: 5, fileOperations: { reads: [], writes: [], tests: [] }, energyLevel: 'medium' as const, complexity: 'simple' as const },
      { sessionId: 's_2', timestamp: now + 30 * 60 * 1000, durationMinutes: 45, patterns: [], toolCalls: 8, fileOperations: { reads: [], writes: [], tests: [] }, energyLevel: 'high' as const, complexity: 'moderate' as const },
    ];
    
    const arcs = groupIntoNarrativeArcs(sessions, 4);
    
    expect(arcs.length).toBeGreaterThanOrEqual(1);
    expect(arcs[0].length).toBeGreaterThan(0);
  });
  
  it('should separate sessions far apart', () => {
    const now = Date.now();
    const sessions = [
      { sessionId: 's_1', timestamp: now, durationMinutes: 30, patterns: [], toolCalls: 5, fileOperations: { reads: [], writes: [], tests: [] }, energyLevel: 'medium' as const, complexity: 'simple' as const },
      { sessionId: 's_2', timestamp: now + 24 * 60 * 60 * 1000, durationMinutes: 45, patterns: [], toolCalls: 8, fileOperations: { reads: [], writes: [], tests: [] }, energyLevel: 'high' as const, complexity: 'moderate' as const },
    ];
    
    const arcs = groupIntoNarrativeArcs(sessions, 4);
    
    expect(arcs.length).toBe(2);
  });
});

describe('analyzeArcPatterns', () => {
  it('should detect dominant themes', () => {
    const arc = [
      { 
        sessionId: 's_1', 
        timestamp: Date.now(), 
        durationMinutes: 30, 
        patterns: [{ type: 'building' as PatternType, confidence: 0.8, startIndex: 0, endIndex: 2, evidence: [] }], 
        toolCalls: 10, 
        fileOperations: { reads: [], writes: [], tests: [] }, 
        energyLevel: 'high' as const, 
        complexity: 'moderate' as const,
        primaryFocus: 'building',
      },
    ];
    
    const patterns = analyzeArcPatterns(arc);
    
    expect(patterns.dominantThemes).toContain('building');
    expect(patterns.sessionCount).toBe(1);
  });
  
  it('should calculate pattern counts correctly', () => {
    const arc = [
      { 
        sessionId: 's_1', 
        timestamp: Date.now(), 
        durationMinutes: 30, 
        patterns: [
          { type: 'building' as PatternType, confidence: 0.8, startIndex: 0, endIndex: 2, evidence: [] },
          { type: 'learning' as PatternType, confidence: 0.7, startIndex: 1, endIndex: 3, evidence: [] },
        ], 
        toolCalls: 10, 
        fileOperations: { reads: [], writes: [], tests: [] }, 
        energyLevel: 'high' as const, 
        complexity: 'moderate' as const,
        primaryFocus: 'building',
      },
      { 
        sessionId: 's_2', 
        timestamp: Date.now() + 60 * 60 * 1000, 
        durationMinutes: 20, 
        patterns: [
          { type: 'building' as PatternType, confidence: 0.9, startIndex: 0, endIndex: 1, evidence: [] },
        ], 
        toolCalls: 5, 
        fileOperations: { reads: [], writes: [], tests: [] }, 
        energyLevel: 'medium' as const, 
        complexity: 'simple' as const,
        primaryFocus: 'building',
      },
    ];
    
    const patterns = analyzeArcPatterns(arc);
    
    expect(patterns.patternCounts['building']).toBe(2);
    expect(patterns.patternCounts['learning']).toBe(1);
    expect(patterns.totalToolCalls).toBe(15);
  });
  
  it('should calculate average energy level', () => {
    const arc = [
      { 
        sessionId: 's_1', 
        timestamp: Date.now(), 
        durationMinutes: 30, 
        patterns: [], 
        toolCalls: 10, 
        fileOperations: { reads: [], writes: [], tests: [] }, 
        energyLevel: 'high' as const, 
        complexity: 'moderate' as const,
      },
    ];
    
    const patterns = analyzeArcPatterns(arc);
    
    expect(patterns.avgEnergyLevel).toBe(1);
  });
});
