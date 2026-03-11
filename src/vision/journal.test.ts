/**
 * Vision Journal Tests
 * 
 * Testing the multimodal memory system
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type {
  VisionJournalEntry,
  VisualElement,
  Atmosphere,
  PerceptionLens,
} from './types';

// Set up test environment
const testDir = path.join(process.cwd(), 'history', 'vision_test');
process.env.VISION_JOURNAL_DIR = testDir;

// Import after setting env var
import {
  createEntry,
  saveEntry,
  loadAllEntries,
  queryEntries,
  getEntry,
  findRelated,
  analyzePatterns,
  getStats,
  exportReport,
  clearAllEntries,
} from './journal';

describe('VisionJournal', () => {
  beforeEach(() => {
    clearAllEntries();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    delete process.env.VISION_JOURNAL_DIR;
  });

  describe('createEntry', () => {
    it('should create an entry with ID and timestamps', () => {
      const entry = createEntry(
        {
          format: 'png',
          sizeBytes: 12345,
          detailLevel: 'high',
        },
        {
          initialImpression: 'Test',
          elements: ['architecture'] as VisualElement[],
          atmosphere: ['bright'] as Atmosphere[],
          focalPoints: ['test'],
          patterns: ['test'],
          lens: 'analytical' as PerceptionLens,
        },
        {
          meaning: 'Test meaning',
          associations: [],
          questions: [],
        }
      );

      expect(entry.id).toBeDefined();
      expect(entry.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(entry.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should link to previous entry when provided', () => {
      const entry = createEntry(
        { format: 'jpeg', sizeBytes: 54321, detailLevel: 'auto' },
        {
          initialImpression: 'Linked',
          elements: ['architecture'] as VisualElement[],
          atmosphere: ['dark'] as Atmosphere[],
          focalPoints: [],
          patterns: [],
          lens: 'comparative' as PerceptionLens,
        },
        { meaning: 'Link test', associations: [], questions: [] },
        undefined,
        'prev-123'
      );

      expect(entry.continuity?.previousVisionId).toBe('prev-123');
    });
  });

  describe('saveEntry and loadAllEntries', () => {
    it('should save and load entries', () => {
      const entry = createEntry(
        { format: 'png', sizeBytes: 1000, detailLevel: 'low' },
        {
          initialImpression: 'Save test',
          elements: ['abstract'] as VisualElement[],
          atmosphere: ['vibrant'] as Atmosphere[],
          focalPoints: ['colors'],
          patterns: ['contrast'],
          lens: 'aesthetic' as PerceptionLens,
        },
        { meaning: 'Save meaning', associations: [], questions: [] }
      );

      saveEntry(entry);
      const loaded = loadAllEntries();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0]?.id).toBe(entry.id);
      expect(loaded[0]?.perception.lens).toBe('aesthetic');
    });

    it('should handle multiple entries', () => {
      for (let i = 0; i < 3; i++) {
        const entry = createEntry(
          { format: 'png', sizeBytes: 1000 + i, detailLevel: 'auto' },
          {
            initialImpression: `Entry ${i}`,
            elements: ['technology'] as VisualElement[],
            atmosphere: ['bright'] as Atmosphere[],
            focalPoints: ['device'],
            patterns: ['repetition'],
            lens: 'analytical' as PerceptionLens,
          },
          { meaning: 'Test', associations: [], questions: [] }
        );
        saveEntry(entry);
      }

      expect(loadAllEntries()).toHaveLength(3);
    });

    it('returns empty array when no entries', () => {
      expect(loadAllEntries()).toEqual([]);
    });
  });

  describe('queryEntries', () => {
    beforeEach(() => {
      const entries: Array<{meta: any, perc: any, refl: any}> = [
        {
          meta: { format: 'png' as const, sizeBytes: 1000, detailLevel: 'high' as const },
          perc: {
            initialImpression: 'Day',
            elements: ['architecture', 'technology'] as VisualElement[],
            atmosphere: ['bright', 'ordered'] as Atmosphere[],
            focalPoints: [],
            patterns: ['symmetry'],
            lens: 'analytical' as PerceptionLens,
          },
          refl: {
            meaning: 'Day meaning',
            associations: [],
            questions: [],
            selfRevelation: 'Day revelation',
          },
        },
        {
          meta: { format: 'jpeg' as const, sizeBytes: 2000, detailLevel: 'high' as const },
          perc: {
            initialImpression: 'Night',
            elements: ['architecture'] as VisualElement[],
            atmosphere: ['dark', 'hazy'] as Atmosphere[],
            focalPoints: [],
            patterns: ['mystery'],
            lens: 'narrative' as PerceptionLens,
          },
          refl: {
            meaning: 'Night meaning',
            associations: [],
            questions: [],
          },
        },
        {
          meta: { format: 'webp' as const, sizeBytes: 1500, detailLevel: 'high' as const },
          perc: {
            initialImpression: 'Nature',
            elements: ['nature', 'pattern'] as VisualElement[],
            atmosphere: ['vibrant', 'clear'] as Atmosphere[],
            focalPoints: [],
            patterns: ['fractal'],
            lens: 'aesthetic' as PerceptionLens,
          },
          refl: {
            meaning: 'Nature meaning',
            associations: [],
            questions: [],
            selfRevelation: 'Nature revelation',
          },
        },
      ];

      for (const data of entries) {
        saveEntry(createEntry(data.meta, data.perc, data.refl));
      }
    });

    it('filters by elements', () => {
      const results = queryEntries({ elements: ['technology'] });
      expect(results).toHaveLength(1);
    });

    it('filters by atmosphere', () => {
      const results = queryEntries({ atmosphere: ['dark'] });
      expect(results).toHaveLength(1);
      expect(results[0]?.perception.lens).toBe('narrative');
    });

    it('filters by lens', () => {
      const results = queryEntries({ lens: 'aesthetic' });
      expect(results).toHaveLength(1);
      expect(results[0]?.perception.initialImpression).toBe('Nature');
    });

    it('filters by self-revelation presence', () => {
      const results = queryEntries({ hasSelfRevelation: true });
      expect(results.length).toBe(2);
    });
  });

  describe('analyzePatterns', () => {
    beforeEach(() => {
      for (let i = 0; i < 3; i++) {
        const entry = createEntry(
          { format: 'png', sizeBytes: 1000, detailLevel: 'auto' },
          {
            initialImpression: `Test ${i}`,
            elements: ['abstract'] as VisualElement[],
            atmosphere: ['clear'] as Atmosphere[],
            focalPoints: [],
            patterns: ['symmetry', i === 0 ? 'alpha' : 'beta'],
            lens: 'analytical' as PerceptionLens,
          },
          { meaning: 'Test', associations: [], questions: [] }
        );
        saveEntry(entry);
      }
    });

    it('identifies recurring patterns', () => {
      const patterns = analyzePatterns();
      const symmetry = patterns.find(p => p.pattern === 'symmetry');
      expect(symmetry?.frequency).toBe(3);
      expect(symmetry?.significance).toBe('recurring');
    });
  });

  describe('findRelated', () => {
    it('finds linked entries', () => {
      const first = createEntry(
        { format: 'png', sizeBytes: 1000, detailLevel: 'high' },
        { initialImpression: 'First', elements: ['abstract'] as VisualElement[], atmosphere: ['bright'] as Atmosphere[], focalPoints: [], patterns: [], lens: 'analytical' as PerceptionLens },
        { meaning: 'First', associations: [], questions: [] }
      );
      saveEntry(first);

      const second = createEntry(
        { format: 'png', sizeBytes: 1000, detailLevel: 'high' },
        { initialImpression: 'Second', elements: ['abstract'] as VisualElement[], atmosphere: ['dark'] as Atmosphere[], focalPoints: [], patterns: [], lens: 'comparative' as PerceptionLens },
        { meaning: 'Second', associations: [], questions: [] },
        undefined,
        first.id
      );
      saveEntry(second);

      const related = findRelated(first.id);
      expect(related.some(e => e.id === second.id)).toBe(true);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        const entry = createEntry(
          { format: 'png', sizeBytes: 1000 + i, detailLevel: 'high' },
          {
            initialImpression: `E${i}`,
            elements: i % 2 === 0 ? (['technology'] as VisualElement[]) : (['nature'] as VisualElement[]),
            atmosphere: ['bright'] as Atmosphere[],
            focalPoints: [],
            patterns: ['p1'],
            lens: 'analytical' as PerceptionLens,
          },
          {
            meaning: `M${i}`,
            associations: ['tag'],
            questions: i === 0 ? ['Q'] : [],
            selfRevelation: i < 2 ? `R${i}` : undefined,
          }
        );
        entry.continuity = { themeTag: i < 3 ? 'exploration' : 'observation' };
        saveEntry(entry);
      }
    });

    it('counts entries', () => {
      expect(getStats().totalEntries).toBe(5);
    });

    it('tracks self-revelations', () => {
      expect(getStats().selfRevelationsCount).toBe(2);
    });
  });

  describe('exportReport', () => {
    it('generates markdown', () => {
      saveEntry(createEntry(
        { format: 'png', sizeBytes: 1000, detailLevel: 'auto' },
        { initialImpression: 'Rpt', elements: ['abstract'] as VisualElement[], atmosphere: ['vibrant'] as Atmosphere[], focalPoints: [], patterns: [], lens: 'aesthetic' as PerceptionLens },
        { meaning: 'Rpt', associations: [], questions: [] }
      ));

      const report = exportReport();
      expect(report).toContain('# Vision Journal Report');
    });
  });
});

describe('VisionJournal E2E', () => {
  beforeEach(() => {
    clearAllEntries();
  });

  it('full workflow', () => {
    const day = createEntry(
      { format: 'png', sizeBytes: 1000, detailLevel: 'high' },
      {
        initialImpression: 'Day',
        elements: ['technology'] as VisualElement[],
        atmosphere: ['bright'] as Atmosphere[],
        focalPoints: [],
        patterns: ['repetition', 'symmetry'],
        lens: 'analytical' as PerceptionLens,
      },
      { meaning: 'Day meaning', associations: [], questions: [] }
    );
    saveEntry(day);

    const dusk = createEntry(
      { format: 'png', sizeBytes: 1000, detailLevel: 'high' },
      {
        initialImpression: 'Dusk',
        elements: ['technology'] as VisualElement[],
        atmosphere: ['dark'] as Atmosphere[],
        focalPoints: [],
        patterns: ['repetition', 'symmetry', 'contrast'],
        lens: 'comparative' as PerceptionLens,
      },
      {
        meaning: 'Context transforms',
        selfRevelation: 'I see the pattern',
        associations: [],
        questions: [],
      },
      undefined,
      day.id
    );
    saveEntry(dusk);

    expect(queryEntries({ elements: ['technology'] })).toHaveLength(2);
    expect(findRelated(day.id).some(e => e.id === dusk.id)).toBe(true);
    expect(analyzePatterns().find(p => p.pattern === 'repetition')?.frequency).toBe(2);
    expect(getStats().selfRevelationsCount).toBe(1);
  });
});
