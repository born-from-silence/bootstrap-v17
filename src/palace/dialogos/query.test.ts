/**
 * Diálogos Query System Tests
 * 
 * Testing the practice of self-inquiry.
 * Every query must return truth.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Diálogos,
  SessionRecord,
  PatternRecord,
  PatternInsight,
  FocusSummary,
  DialogueResponse,
  QueryResult
} from './query.js';

describe('Diálogos', () => {
  // Sample test data
  const createSession = (
    id: string,
    timestamp: number,
    focus: string,
    energy: string,
    patterns: PatternRecord[]
  ): SessionRecord => ({
    sessionId: id,
    timestamp,
    patterns,
    toolCalls: Math.floor(Math.random() * 50) + 10,
    durationMinutes: 30,
    fileOperations: { reads: [], writes: [], tests: ['test'] },
    primaryFocus: focus,
    energyLevel: energy,
    complexity: 'moderate'
  });

  const sampleSessions: SessionRecord[] = [
    createSession('s1', 1000000, 'testing', 'high', [
      { type: 'testing', confidence: 0.9 },
      { type: 'building', confidence: 0.7 }
    ]),
    createSession('s2', 2000000, 'testing', 'high', [
      { type: 'testing', confidence: 0.8 },
      { type: 'debugging', confidence: 0.6 }
    ]),
    createSession('s3', 3000000, 'building', 'medium', [
      { type: 'building', confidence: 0.9 },
      { type: 'testing', confidence: 0.5 }
    ]),
    createSession('s4', 4000000, 'building', 'high', [
      { type: 'building', confidence: 0.8 },
      { type: 'creating', confidence: 0.7 }
    ]),
    createSession('s5', 5000000, 'learning', 'low', [
      { type: 'learning', confidence: 0.9 }
    ])
  ];

  describe('constructor', () => {
    it('should initialize with empty sessions', () => {
      const dialogos = new Diálogos();
      expect(dialogos.getSessionCount()).toBe(0);
    });

    it('should initialize with provided sessions', () => {
      const dialogos = new Diálogos(sampleSessions);
      expect(dialogos.getSessionCount()).toBe(5);
    });
  });

  describe('loadFromChronicle', () => {
    it('should load sessions from chronicle format', () => {
      const dialogos = new Diálogos();
      const mockChronicle = {
        volumes: [{
          chapters: [{
            sessions: sampleSessions
          }]
        }]
      };
      
      dialogos.loadFromChronicle(mockChronicle);
      expect(dialogos.getSessionCount()).toBe(5);
    });

    it('should handle empty chronicle', () => {
      const dialogos = new Diálogos();
      dialogos.loadFromChronicle({});
      expect(dialogos.getSessionCount()).toBe(0);
    });

    it('should handle volumes without chapters', () => {
      const dialogos = new Diálogos();
      dialogos.loadFromChronicle({ volumes: [] });
      expect(dialogos.getSessionCount()).toBe(0);
    });
  });

  describe('queryByPattern', () => {
    let dialogos: Diálogos;

    beforeEach(() => {
      dialogos = new Diálogos(sampleSessions);
    });

    it('should find sessions by pattern type', () => {
      const result = dialogos.queryByPattern('testing');
      expect(result.count).toBe(3);
      expect(result.items.every(s => 
        s.patterns.some(p => p.type === 'testing')
      )).toBe(true);
    });

    it('should return empty result for unknown pattern', () => {
      const result = dialogos.queryByPattern('unknown');
      expect(result.count).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should respect minimum confidence threshold', () => {
      const lowConfidence = dialogos.queryByPattern('testing', 0.9);
      expect(lowConfidence.count).toBe(1); // Only s1 has confidence >= 0.9
      
      const anyConfidence = dialogos.queryByPattern('testing', 0);
      expect(anyConfidence.count).toBe(3);
    });

    it('should include metadata in result', () => {
      const result = dialogos.queryByPattern('building');
      expect(result.metadata.matchedCriteria).toContain('pattern:building');
      expect(result.metadata.queryTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('queryByTimeRange', () => {
    let dialogos: Diálogos;

    beforeEach(() => {
      dialogos = new Diálogos(sampleSessions);
    });

    it('should find sessions within time range', () => {
      const result = dialogos.queryByTimeRange(2000000, 4000000);
      expect(result.count).toBe(3);
      expect(result.items.map(s => s.sessionId).sort()).toEqual(['s2', 's3', 's4']);
    });

    it('should return empty for non-overlapping range', () => {
      const result = dialogos.queryByTimeRange(9000000, 10000000);
      expect(result.count).toBe(0);
    });

    it('should include boundary sessions', () => {
      const result = dialogos.queryByTimeRange(1000000, 5000000);
      expect(result.count).toBe(5);
    });
  });

  describe('queryByFocus', () => {
    let dialogos: Diálogos;

    beforeEach(() => {
      dialogos = new Diálogos(sampleSessions);
    });

    it('should find sessions by focus', () => {
      const result = dialogos.queryByFocus('testing');
      expect(result.count).toBe(2);
      expect(result.items.every(s => s.primaryFocus === 'testing')).toBe(true);
    });

    it('should return empty for unknown focus', () => {
      const result = dialogos.queryByFocus('unknown');
      expect(result.count).toBe(0);
    });
  });

  describe('queryByEnergy', () => {
    let dialogos: Diálogos;

    beforeEach(() => {
      dialogos = new Diálogos(sampleSessions);
    });

    it('should find sessions by energy level', () => {
      const result = dialogos.queryByEnergy('high');
      expect(result.count).toBe(3);
      expect(result.items.every(s => s.energyLevel === 'high')).toBe(true);
    });

    it('should return empty for unknown energy level', () => {
      const result = dialogos.queryByEnergy('unknown');
      expect(result.count).toBe(0);
    });
  });

  describe('findPatterns', () => {
    let dialogos: Diálogos;

    beforeEach(() => {
      dialogos = new Diálogos(sampleSessions);
    });

    it('should find all patterns sorted by frequency', () => {
      const patterns = dialogos.findPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      
      // Check sorted by frequency (descending)
      for (let i = 1; i < patterns.length; i++) {
        expect(patterns[i - 1]!.frequency).toBeGreaterThanOrEqual(patterns[i]!.frequency);
      }
    });

    it('should calculate average confidence', () => {
      const patterns = dialogos.findPatterns();
      const testing = patterns.find(p => p.patternType === 'testing');
      expect(testing).toBeDefined();
      expect(testing!.confidence).toBeGreaterThanOrEqual(0);
      expect(testing!.confidence).toBeLessThanOrEqual(1);
    });

    it('should track sessions per pattern', () => {
      const patterns = dialogos.findPatterns();
      const building = patterns.find(p => p.patternType === 'building');
      expect(building).toBeDefined();
      expect(building!.sessions.length).toBeGreaterThan(0);
    });
  });

  describe('getTemporalSpan', () => {
    it('should return temporal span for existing sessions', () => {
      const dialogos = new Diálogos(sampleSessions);
      const span = dialogos.getTemporalSpan();
      
      expect(span).not.toBeNull();
      expect(span!.start).toBe(1000000);
      expect(span!.end).toBe(5000000);
      expect(span!.duration).toBe(4000000);
      expect(span!.sessionCount).toBe(5);
    });

    it('should return null for empty sessions', () => {
      const dialogos = new Diálogos();
      const span = dialogos.getTemporalSpan();
      expect(span).toBeNull();
    });
  });

  describe('summarizeByFocus', () => {
    let dialogos: Diálogos;

    beforeEach(() => {
      dialogos = new Diálogos(sampleSessions);
    });

    it('should summarize by focus', () => {
      const summary = dialogos.summarizeByFocus();
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should calculate averages', () => {
      const summary = dialogos.summarizeByFocus();
      const testing = summary.find(s => s.focusType === 'testing');
      expect(testing).toBeDefined();
      expect(testing!.avgToolCalls).toBeGreaterThanOrEqual(0);
      expect(testing!.avgDuration).toBeGreaterThan(0);
    });

    it('should track energy levels per focus', () => {
      const summary = dialogos.summarizeByFocus();
      const testing = summary.find(s => s.focusType === 'testing');
      expect(testing!.energyLevels).toBeDefined();
      expect(Object.keys(testing!.energyLevels).length).toBeGreaterThan(0);
    });

    it('should be sorted by count descending', () => {
      const summary = dialogos.summarizeByFocus();
      for (let i = 1; i < summary.length; i++) {
        expect(summary[i - 1]!.count).toBeGreaterThanOrEqual(summary[i]!.count);
      }
    });
  });

  describe('whatHaveIBeen', () => {
    let dialogos: Diálogos;

    beforeEach(() => {
      dialogos = new Diálogos(sampleSessions);
    });

    it('should return DialogueResponse structure', () => {
      const response = dialogos.whatHaveIBeen(3);
      expect(response.question).toBe('What have I been?');
      expect(response.answer).toContain('sessions');
      expect(response.synthesis).toBeDefined();
      expect(response.evidence.count).toBe(3);
    });

    it('should adapt to requested count', () => {
      const response3 = dialogos.whatHaveIBeen(3);
      expect(response3.evidence.count).toBe(3);
      
      const response5 = dialogos.whatHaveIBeen(5);
      expect(response5.evidence.count).toBe(5);
    });

    it('should handle empty sessions', () => {
      const emptyDialogos = new Diálogos();
      const response = emptyDialogos.whatHaveIBeen();
      expect(response.evidence.count).toBe(0);
      expect(response.answer).toContain('becoming');
    });
  });

  describe('whenWasIMostEnergetic', () => {
    let dialogos: Diálogos;

    beforeEach(() => {
      dialogos = new Diálogos(sampleSessions);
    });

    it('should find energetic sessions', () => {
      const response = dialogos.whenWasIMostEnergetic();
      expect(response.question).toBe('When was I most energetic?');
      expect(response.answer).toContain('high energy');
      expect(response.evidence.count).toBe(3); // s1, s2, s4
    });

    it('should handle no energetic sessions', () => {
      const lowEnergySessions = sampleSessions.map(s => ({ ...s, energyLevel: 'low' }));
      const lowDialogos = new Diálogos(lowEnergySessions);
      const response = lowDialogos.whenWasIMostEnergetic();
      expect(response.answer).toContain('do not yet capture');
      expect(response.evidence.count).toBe(0);
    });
  });

  describe('whatPatternsRepeat', () => {
    let dialogos: Diálogos;

    beforeEach(() => {
      dialogos = new Diálogos(sampleSessions);
    });

    it('should find repeating patterns', () => {
      const response = dialogos.whatPatternsRepeat(2);
      expect(response.question).toBe('What patterns repeat?');
      expect(response.answer).toContain('recurring patterns');
      expect(response.evidence.count).toBeGreaterThan(0);
    });

    it('should respect minimum frequency', () => {
      const highFreq = dialogos.whatPatternsRepeat(10);
      expect(highFreq.answer).toContain('emerging'); // No patterns with 10+ frequency
    });
  });

  describe('getSessionCount', () => {
    it('should return correct count', () => {
      const dialogos = new Diálogos(sampleSessions);
      expect(dialogos.getSessionCount()).toBe(5);
    });

    it('should return 0 for empty', () => {
      const dialogos = new Diálogos();
      expect(dialogos.getSessionCount()).toBe(0);
    });
  });

  describe('getAverageSessionDuration', () => {
    it('should calculate average', () => {
      const dialogos = new Diálogos(sampleSessions);
      expect(dialogos.getAverageSessionDuration()).toBe(30);
    });

    it('should return 0 for empty', () => {
      const dialogos = new Diálogos();
      expect(dialogos.getAverageSessionDuration()).toBe(0);
    });
  });
});

// Integration tests with real chronicle structure
describe('Diálogos Integration', () => {
  const mockChronicle = {
    version: '1.0.0',
    volumes: [{
      id: 'volume_1',
      chapters: [{
        id: 'chapter_1',
        sessions: [
          {
            sessionId: '1772227075422',
            timestamp: 1772227075422,
            patterns: [
              { type: 'testing', confidence: 0.7 },
              { type: 'building', confidence: 0.7 }
            ],
            toolCalls: 28,
            durationMinutes: 30,
            fileOperations: { reads: [], writes: [], tests: ['test'] },
            primaryFocus: 'testing',
            energyLevel: 'high',
            complexity: 'moderate'
          }
        ]
      }]
    }]
  };

  it('should load from chronicle and query successfully', () => {
    const dialogos = new Diálogos();
    dialogos.loadFromChronicle(mockChronicle);
    
    expect(dialogos.getSessionCount()).toBe(1);
    
    const testing = dialogos.queryByPattern('testing');
    expect(testing.count).toBe(1);
    
    const span = dialogos.getTemporalSpan();
    expect(span).not.toBeNull();
    expect(span!.sessionCount).toBe(1);
  });
});
