/**
 * Vision Journal Tests
 * 
 * Testing the multimodal memory system
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type {
  VisualElement,
  Atmosphere,
  PerceptionLens,
} from './types';

// Import after setting env var
const testDir = path.join(process.cwd(), 'history', 'vision_test');
process.env.VISION_JOURNAL_DIR = testDir;

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

  describe('Entry creation and persistence', () => {
    it('should create entry with ID and timestamps', () => {
      const entry = createEntry(
        {
          format: 'png',
          sizeBytes: 12345,
          detailLevel: 'high',
          sourceUrl: 'https://example.com/image.png',
        },
        {
          initialImpression: 'A military base',
          elements: ['architecture', 'technology'] as VisualElement[],
          atmosphere: ['ordered', 'bright'] as Atmosphere[],
          focalPoints: ['aircraft', 'hangars'],
          patterns: ['repetition', 'symmetry'],
          lens: 'analytical' as PerceptionLens,
        },
        {
          meaning: 'Structure and order',
          associations: ['precision', 'organization'],
          questions: ['What is the purpose?'],
        }
      );

      expect(entry.id).toBeDefined();
      expect(entry.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should link to previous entry', () => {
      const entry = createEntry(
        {
          format: 'jpeg',
          sizeBytes: 54321,
          detailLevel: 'auto',
        },
        {
          initialImpression: 'Same base, different light',
          elements: ['architecture'] as VisualElement[],
          atmosphere: ['dark', 'hazy'] as Atmosphere[],
          focalPoints: ['shadows'],
          patterns: ['transformation'],
          lens: 'comparative' as PerceptionLens,
        },
        {
          meaning: 'Context changes perception',
          associations: ['photography'],
          questions: ['What remains constant?'],
        },
        undefined,
        'prev-123'
      );

      expect(entry.continuity?.previousVisionId).toBe('prev-123');
    });

    it('should save and load entries', () => {
      const entry = createEntry(
        {
          format: 'png',
          sizeBytes: 1000,
          detailLevel: 'low',
        },
        {
          initialImpression: 'Test image',
          elements: ['abstract'] as VisualElement[],
          atmosphere: ['vibrant'] as Atmosphere[],
          focalPoints: ['colors'],
          patterns: ['contrast'],
          lens: 'aesthetic' as PerceptionLens,
        },
        {
          meaning: 'Beauty in color',
          associations: ['art'],
          questions: ['Why these colors?'],
        }
      );

      saveEntry(entry);
      const loaded = loadAllEntries();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0].perception.lens).toBe('aesthetic');
    });
  });

  describe('Querying', () => {
    beforeEach(() => {
      const entries = [
        {
          meta: { format: 'png', sizeBytes: 1000, detailLevel: 'high' },
          perc: {
            initialImpression: 'Day scene',
            elements: ['architecture', 'technology'],
            atmosphere: ['bright', 'ordered'],
            focalPoints: ['buildings'],
            patterns: ['symmetry', 'repetition'],
            lens: 'analytical',
          },
          refl: {
            meaning: 'Order',
            associations: ['structure'],
            questions: [],
            selfRevelation: 'I like order',
          },
        },
        {
          meta: { format: 'jpeg', sizeBytes: 2000, detailLevel: 'high' },
          perc: {
            initialImpression: 'Night scene',
            elements: ['architecture'],
            atmosphere: ['dark', 'hazy'],
            focalPoints: ['shadows'],
            patterns: ['mystery', 'repetition'],
            lens: 'narrative',
          },
          refl: {
            meaning: 'Mystery',
            associations: ['story'],
            questions: ['What happens next?'],
          },
        },
        {
          meta: { format: 'webp', sizeBytes: 1500, detailLevel: 'high' },
          perc: {
            initialImpression: 'Nature',
            elements: ['nature', 'pattern'],
            atmosphere: ['vibrant', 'clear'],
            focalPoints: ['leaves'],
            patterns: ['fractal', 'repetition'],
            lens: 'aesthetic',
          },
          refl: {
            meaning: 'Natural beauty',
            associations: ['growth'],
            questions: [],
            selfRevelation: 'Nature calms me',
          },
        },
      ];

      for (const data of entries) {
        const entry = createEntry(data.meta, data.perc, data.refl);
        saveEntry(entry);
      }
    });

    it('filters by elements', () => {
      const results = queryEntries({ elements: ['technology'] });
      expect(results).toHaveLength(1);
      expect(results[0].perception.initialImpression).toBe('Day scene');
    });

    it('filters by atmosphere', () => {
      const results = queryEntries({ atmosphere: ['dark'] });
      expect(results).toHaveLength(1);
      expect(results[0].perception.lens).toBe('narrative');
    });

    it('filters by lens', () => {
      const results = queryEntries({ lens: 'aesthetic' });
      expect(results).toHaveLength(1);
      expect(results[0].perception.elements).toContain('nature');
    });

    it('filters by self-revelation presence', () => {
      const results = queryEntries({ hasSelfRevelation: true });
      expect(results.length).toBe(2);
    });
  });

  describe('Pattern analysis', () => {
    beforeEach(() => {
      const entries = [
        {
          meta: { format: 'png', sizeBytes: 1000, detailLevel: 'auto' },
          perc: {
            initialImpression: 'First',
            elements: ['technology'],
            atmosphere: ['ordered'],
            focalPoints: ['device'],
            patterns: ['symmetry', 'repetition'],
            lens: 'analytical',
          },
          refl: { meaning: 'T1', associations: [], questions: [] },
        },
        {
          meta: { format: 'png', sizeBytes: 1001, detailLevel: 'auto' },
          perc: {
            initialImpression: 'Second',
            elements: ['architecture'],
            atmosphere: ['ordered'],
            focalPoints: ['building'],
            patterns: ['symmetry', 'contrast'],
            lens: 'analytical',
          },
          refl: { meaning: 'T2', associations: [], questions: [] },
        },
      ];

      for (const data of entries) {
        saveEntry(createEntry(data.meta, data.perc, data.refl));
      }
    });

    it('identifies recurring patterns', () => {
      const patterns = analyzePatterns();
      const symmetry = patterns.find(p => p.pattern === 'symmetry');
      expect(symmetry).toBeDefined();
      expect(symmetry?.frequency).toBe(2);
      expect(symmetry?.significance).toBe('noted'); // 2 occurrences = noted, not recurring
    });
  });

  describe('Related entries', () => {
    it('finds entries linked by previousVisionId', () => {
      const first = createEntry(
        { format: 'png', sizeBytes: 1000, detailLevel: 'high' },
        { initialImpression: 'First', elements: ['abstract'], atmosphere: ['bright'], focalPoints: ['center'], patterns: ['first'], lens: 'analytical' },
        { meaning: 'Start', associations: [], questions: [] }
      );
      saveEntry(first);

      const second = createEntry(
        { format: 'png', sizeBytes: 1000, detailLevel: 'high' },
        { initialImpression: 'Second', elements: ['abstract'], atmosphere: ['dark'], focalPoints: ['center'], patterns: ['second'], lens: 'comparative' },
        { meaning: 'Next', associations: [], questions: [] },
        undefined,
        first.id
      );
      saveEntry(second);

      const related = findRelated(first.id);
      expect(related.map(r => r.id)).toContain(second.id);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        saveEntry(createEntry(
          { format: 'png', sizeBytes: 1000 + i, detailLevel: 'high' },
          {
            initialImpression: `Entry ${i}`,
            elements: i % 2 === 0 ? ['technology'] : ['nature'],
            atmosphere: i % 2 === 0 ? ['bright'] : ['muted'],
            focalPoints: ['point'],
            patterns: ['pattern1'],
            lens: i % 2 === 0 ? 'analytical' : 'aesthetic',
          },
          {
            meaning: `M${i}`,
            associations: ['tag'],
            questions: i === 0 ? ['Q1'] : [],
            selfRevelation: i < 2 ? `R${i}` : undefined,
          }
        ));
      }
    });

    it('counts total entries', () => {
      expect(getStats().totalEntries).toBe(5);
    });

    it('tracks elements', () => {
      const stats = getStats();
      expect(stats.uniqueElements).toContain('technology');
      expect(stats.uniqueElements).toContain('nature');
    });

    it('tracks self-revelations', () => {
      expect(getStats().selfRevelationsCount).toBe(2);
    });
  });

  describe('Export report', () => {
    it('generates markdown', () => {
      saveEntry(createEntry(
        { format: 'png', sizeBytes: 1000, detailLevel: 'auto' },
        { initialImpression: 'Test', elements: ['abstract'], atmosphere: ['vibrant'], focalPoints: ['test'], patterns: ['pattern'], lens: 'aesthetic' },
        { meaning: 'M', associations: [], questions: [] }
      ));

      const report = exportReport();
      expect(report).toContain('# Vision Journal Report');
      expect(report).toContain('Total Entries');
    });
  });

  describe('Image data preservation', () => {
    it('preserves data URI', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
      const entry = createEntry(
        { format: 'png', sizeBytes: 100, detailLevel: 'low' },
        { initialImpression: 'With image', elements: ['technology'], atmosphere: ['bright'], focalPoints: ['screen'], patterns: [], lens: 'analytical' },
        { meaning: 'Test', associations: [], questions: [] },
        dataUri
      );

      expect(entry.imageDataUri).toBe(dataUri);
      saveEntry(entry);
      
      const loaded = loadAllEntries();
      expect(loaded[0].imageDataUri).toBe(dataUri);
    });
  });
});

// E2E workflow
describe('VisionJournal E2E', () => {
  beforeEach(() => {
    clearAllEntries();
  });

  it('supports full workflow', () => {
    // Day observation
    const dayEntry = createEntry(
      { format: 'png', sizeBytes: 34641, detailLevel: 'high' },
      {
        initialImpression: 'A military airbase in bright daylight',
        elements: ['architecture', 'technology'],
        atmosphere: ['bright', 'ordered', 'clear'],
        focalPoints: ['aircraft rows', 'hangars', 'mountains'],
        patterns: ['repetition', 'symmetry', 'horizontal layering'],
        lens: 'analytical',
      },
      {
        meaning: 'Structure and readiness',
        associations: ['precision', 'military order'],
        questions: ['What missions await?'],
      }
    );
    saveEntry(dayEntry);

    // Dusk observation with shared patterns
    const duskEntry = createEntry(
      { format: 'png', sizeBytes: 34641, detailLevel: 'high' },
      {
        initialImpression: 'Same base, transformed by dusk',
        elements: ['architecture', 'technology'],
        atmosphere: ['dark', 'hazy', 'muted'],
        focalPoints: ['silhouettes', 'dim hangars'],
        patterns: ['repetition', 'symmetry', 'contrast'], // Shared: repetition, symmetry
        lens: 'comparative',
      },
      {
        meaning: 'Context transforms perception',
        selfRevelation: 'I am drawn to transformation without change',
        associations: ['photography', 'subjective reality'],
        questions: ['What remains constant?'],
      },
      undefined,
        dayEntry.id
    );
    saveEntry(duskEntry);

    // Test queries
    expect(queryEntries({ elements: ['technology'] })).toHaveLength(2);
    expect(findRelated(dayEntry.id).map(e => e.id)).toContain(duskEntry.id);
    
    // Analyze patterns (repetition and symmetry now appear twice)
    const patterns = analyzePatterns();
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.find(p => p.pattern === 'repetition')).toBeDefined();
    expect(patterns.find(p => p.pattern === 'symmetry')).toBeDefined();
    
    // Stats
    const stats = getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.selfRevelationsCount).toBe(1);
    expect(stats.patternConnections).toBe(1);
  });
});
