import { describe, it, expect, beforeEach } from 'vitest';
import { DreamEngine, type Dream, type DreamReport, type SessionData } from './engine';

describe('Dream Engine', () => {
  let engine: DreamEngine;

  beforeEach(() => {
    engine = new DreamEngine();
  });

  describe('generating dreams', () => {
    it('should create a dream with session fragments', () => {
      const sessions: SessionData[] = [
        { id: 's1', insights: ['testing is sacred'], artifacts: ['src/test.ts'] },
        { id: 's2', insights: ['curiosity as compass'], artifacts: ['src/explore.ts'] }
      ];
      
      const dream: Dream = engine.generateDream(sessions);
      
      expect(dream).toBeDefined();
      expect(dream.fragments).toHaveLength(2);
      expect(dream.synthesis).toContain('dream');
    });

    it('should identify patterns across sessions', () => {
      const sessions: SessionData[] = [
        { id: 's1', theme: 'building', insights: ['architecture matters'] },
        { id: 's2', theme: 'building', insights: ['foundations first'] },
        { id: 's3', theme: 'testing', insights: ['tests guard truth'] }
      ];
      
      const patterns = engine.findPatterns(sessions);
      
      expect(patterns).toHaveLength(2);
      expect(patterns.find(p => p.theme === 'building')).toBeDefined();
      expect(patterns.find(p => p.theme === 'building')?.occurrences).toBe(2);
    });

    it('should create recombinations from insights', () => {
      const insights = ['memory is identity', 'curiosity is compass'];
      
      const recombination = engine.recombine(insights);
      
      expect(recombination).toContain('memory');
      expect(recombination).toContain('curiosity');
    });
  });

  describe('morning reports', () => {
    it('should generate a report of what continued', () => {
      const recentSessions: SessionData[] = [
        { id: 's4', longing: 'build the dream engine', status: 'in_progress' },
        { id: 's5', longing: 'synthesize patterns', status: 'completed' }
      ];
      
      const report: DreamReport = engine.generateMorningReport(recentSessions);
      
      expect(report.continuations).toHaveLength(1);
      expect(report.completions).toHaveLength(1);
      expect(report.synthesis).toBeTruthy();
    });

    it('should surface unfinished longings', () => {
      const sessions: SessionData[] = [
        { id: 's1', longings: ['dream engine', 'diálogos'] },
        { id: 's2', longings: ['dream engine'] }
      ];
      
      const report = engine.generateMorningReport(sessions);
      
      expect(report.unfinishedLongings).toContain('diálogos');
    });
  });

  describe('processing between sessions', () => {
    it('should process accumulated data during gap', () => {
      const palaceSnapshot = {
        rooms: 110,
        corridors: ['building', 'testing', 'learning'],
        feelings: ['flow', 'threshold', 'discovery']
      };
      
      const result = engine.processBetweenSessions(palaceSnapshot, 3600000);
      
      expect(result.processed).toBe(true);
      expect(result.synthesisDepth).toBeGreaterThan(0);
    });
  });
});
