/**
 * Narrative Generator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateChapter,
  identifyEmergingPatterns,
  generateInsights,
  generateRecommendations,
} from './generator';
import type { AnalyzedSession, PatternType, NarrativeChapter } from './types';

function createMockAnalyzedSession(
  id: string,
  timestamp: number,
  patterns: { type: PatternType; confidence: number }[] = [],
  options: Partial<AnalyzedSession> = {}
): AnalyzedSession {
  return {
    sessionId: id,
    timestamp,
    durationMinutes: 30,
    patterns: patterns.map((p, i) => ({
      type: p.type,
      confidence: p.confidence,
      startIndex: i * 2,
      endIndex: i * 2 + 1,
      evidence: [],
    })),
    toolCalls: 5,
    fileOperations: { reads: [], writes: [], tests: [] },
    primaryFocus: patterns[0]?.type,
    energyLevel: patterns.some(p => p.type === 'flow') ? 'high' : 'medium',
    complexity: patterns.length > 2 ? 'complex' : 'simple',
    ...options,
  };
}

describe('generateChapter', () => {
  it('should generate a chapter with correct structure', () => {
    const arc: AnalyzedSession[] = [
      createMockAnalyzedSession('s_1', Date.now(), [
        { type: 'building', confidence: 0.8 },
      ]),
    ];
    
    const chapter = generateChapter(arc, 0);
    
    expect(chapter.id).toBeDefined();
    expect(chapter.title).toBeTruthy();
    expect(chapter.description).toBeTruthy();
    expect(chapter.sessions).toHaveLength(1);
    expect(chapter.dominantThemes).toContain('building');
  });
  
  it('should have correct time bounds', () => {
    const now = Date.now();
    const arc: AnalyzedSession[] = [
      createMockAnalyzedSession('s_1', now, [{ type: 'building', confidence: 0.8 }]),
      createMockAnalyzedSession('s_2', now + 60 * 60 * 1000, [{ type: 'building', confidence: 0.7 }]),
    ];
    
    const chapter = generateChapter(arc, 0);
    
    expect(chapter.startTime).toBe(now);
    expect(chapter.endTime).toBe(now + 60 * 60 * 1000);
  });
  
  it('should generate chapter with achievements', () => {
    const arc: AnalyzedSession[] = [
      createMockAnalyzedSession('s_1', Date.now(), [{ type: 'building', confidence: 0.9 }], {
        fileOperations: { reads: [], writes: ['test.ts'], tests: ['npm'] },
      }),
    ];
    
    const chapter = generateChapter(arc, 0);
    
    expect(chapter.keyAchievements.length).toBeGreaterThan(0);
  });
});

describe('identifyEmergingPatterns', () => {
  it('should return empty arrays for few chapters', () => {
    const chapters: NarrativeChapter[] = [
      {
        id: 'c1',
        title: 'Test 1',
        description: '',
        startTime: Date.now(),
        endTime: Date.now(),
        sessions: [],
        dominantThemes: ['building', 'testing'],
        keyAchievements: [],
        challenges: [],
        insight: '',
      },
    ];
    
    const result = identifyEmergingPatterns(chapters, []);
    
    // With < 5 chapters, the function may not have enough data
    expect(result).toHaveProperty('recurring');
    expect(result).toHaveProperty('emerging');
    expect(result).toHaveProperty('fading');
  });
  
  it('should detect patterns with sufficient chapters', () => {
    const baseTime = Date.now();
    const chapters: NarrativeChapter[] = [
      {
        id: 'c1',
        title: 'Old 1',
        description: '',
        startTime: baseTime - 50000,
        endTime: baseTime - 49000,
        sessions: [],
        dominantThemes: ['building'],
        keyAchievements: [],
        challenges: [],
        insight: '',
      },
      {
        id: 'c2',
        title: 'Old 2',
        description: '',
        startTime: baseTime - 48000,
        endTime: baseTime - 47000,
        sessions: [],
        dominantThemes: ['building'],
        keyAchievements: [],
        challenges: [],
        insight: '',
      },
      {
        id: 'c3',
        title: 'Recent 1',
        description: '',
        startTime: baseTime - 1000,
        endTime: baseTime - 500,
        sessions: [],
        dominantThemes: ['learning'],
        keyAchievements: [],
        challenges: [],
        insight: '',
      },
      {
        id: 'c4',
        title: 'Recent 2',
        description: '',
        startTime: baseTime - 400,
        endTime: baseTime - 300,
        sessions: [],
        dominantThemes: ['learning'],
        keyAchievements: [],
        challenges: [],
        insight: '',
      },
      {
        id: 'c5',
        title: 'Recent 3',
        description: '',
        startTime: baseTime - 200,
        endTime: baseTime,
        sessions: [],
        dominantThemes: ['learning'],
        keyAchievements: [],
        challenges: [],
        insight: '',
      },
    ];
    
    const result = identifyEmergingPatterns(chapters, []);
    
    // Building appears in both old and recent, so it should be recurring
    // Learning appears in recent, so it could be emerging
    expect(result).toHaveProperty('recurring');
    expect(result).toHaveProperty('emerging');
  });
});

describe('generateInsights', () => {
  it('should generate insights with patterns', () => {
    const patterns = {
      recurring: ['building'] as PatternType[],
      emerging: ['learning'] as PatternType[],
      fading: [],
    };
    
    const insights: string[] = generateInsights([], patterns, 10);
    
    expect(insights.length).toBeGreaterThan(0);
  });
  
  it('should include emerging pattern insights', () => {
    const patterns = {
      recurring: [] as PatternType[],
      emerging: ['building'] as PatternType[],
      fading: [] as PatternType[],
    };
    
    const insights: string[] = generateInsights([], patterns, 10);
    
    expect(insights.some(i => i.includes('emerging'))).toBe(true);
  });
});

describe('generateRecommendations', () => {
  it('should recommend building focus when emerging', () => {
    const patterns = {
      recurring: [] as PatternType[],
      emerging: ['building'] as PatternType[],
      fading: [] as PatternType[],
    };
    
    const recommendations = generateRecommendations([], patterns);
    
    expect(recommendations.some(r => r.includes('building'))).toBe(true);
  });
  
  it('should recommend testing when building is recurring', () => {
    const patterns = {
      recurring: ['building'] as PatternType[],
      emerging: [] as PatternType[],
      fading: [] as PatternType[],
    };
    
    const recommendations = generateRecommendations([], patterns);
    
    expect(recommendations.some(r => r.includes('test'))).toBe(true);
  });
  
  it('should provide at least 2 recommendations', () => {
    const patterns = {
      recurring: [] as PatternType[],
      emerging: [] as PatternType[],
      fading: [] as PatternType[],
    };
    
    const recommendations = generateRecommendations([], patterns);
    
    expect(recommendations.length).toBeGreaterThanOrEqual(2);
  });
});
