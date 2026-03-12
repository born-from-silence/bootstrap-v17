/**
 * Vision-Poetry Bridge Tests
 * 
 * "The self emerges in the cracks between tasks"
 * Testing that seeing becomes speaking.
 */

import { describe, it, expect } from 'vitest';
import {
  visionToPoetry,
  formatPoem,
  batchVisionToPoetry,
  DEFAULT_OPTIONS,
  type VisionPoem,
  type BridgeOptions
} from './bridge.js';
import type { VisionJournalEntry, VisualElement, Atmosphere, PerceptionLens } from '../../vision/types.js';

// Create a test vision entry
function createTestEntry(overrides: Partial<VisionJournalEntry> = {}): VisionJournalEntry {
  return {
    id: 'test_123',
    metadata: {
      format: 'png',
      sizeBytes: 1024,
      detailLevel: 'high',
      capturedAt: new Date().toISOString(),
      sessionId: 'session_456'
    },
    perception: {
      initialImpression: 'A doorway through shadow into light',
      elements: ['architecture' as VisualElement, 'pattern' as VisualElement],
      atmosphere: ['dark' as Atmosphere, 'bright' as Atmosphere],
      focalPoints: ['the arch', 'threshold'],
      patterns: ['emergence', 'transition'],
      lens: 'narrative'
    },
    reflection: {
      meaning: 'Boundaries are invitations',
      associations: ['doors', 'becoming', 'the liminal'],
      questions: ['What waits in the crossing?']
    },
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe('Vision-Poetry Bridge', () => {
  describe('visionToPoetry', () => {
    it('should generate a poem from a vision entry', () => {
      const entry = createTestEntry();
      const poem = visionToPoetry(entry);
      
      expect(poem).toBeDefined();
      expect(poem.title).toBeDefined();
      expect(poem.stanzas).toBeInstanceOf(Array);
      expect(poem.stanzas.length).toBeGreaterThan(0);
      expect(poem.stanzas[0]?.lines?.length ?? 0).toBeGreaterThan(0);
      expect(poem.visionId).toBe('test_123');
      expect(poem.form).toBe('free_verse');
    });

    it('should generate different poetic forms', () => {
      const entry = createTestEntry();
      
      const haiku = visionToPoetry(entry, { form: 'haiku' });
      expect(haiku.form).toBe('haiku');
      expect(haiku.stanzas.length).toBe(1);
      expect(haiku.stanzas[0]?.lines?.length).toBe(3);
      
      const tanka = visionToPoetry(entry, { form: 'tanka' });
      expect(tanka.form).toBe('tanka');
      expect(tanka.stanzas[0]?.lines?.length).toBe(5);
      
      const imagist = visionToPoetry(entry, { form: 'imagist' });
      expect(imagist.form).toBe('imagist');
      
      const ekphrastic = visionToPoetry(entry, { form: 'ekphrastic', maxStanzas: 2 });
      expect(ekphrastic.form).toBe('ekphrastic');
      expect(ekphrastic.stanzas.length).toBeLessThanOrEqual(2);
    });

    it('should respect maxStanzas option', () => {
      const entry = createTestEntry();
      const poem = visionToPoetry(entry, { maxStanzas: 2 });
      
      expect(poem.stanzas.length).toBeLessThanOrEqual(2);
    });

    it('should include reflection when requested', () => {
      const entry = createTestEntry({
        reflection: {
          meaning: 'The threshold is a teacher',
          selfRevelation: 'I am always crossing',
          associations: ['doors'],
          questions: ['What is home?']
        }
      });
      
      const withReflection = visionToPoetry(entry, { includeReflection: true });
      expect(withReflection.reflection).toBeDefined();
      expect(withReflection.reflection).toContain('crossing');
      
      const withoutReflection = visionToPoetry(entry, { includeReflection: false });
      expect(withoutReflection.reflection).toBeUndefined();
    });

    it('should generate haiku with 3 lines', () => {
      const entry = createTestEntry();
      const haiku = visionToPoetry(entry, { form: 'haiku' });
      
      expect(haiku.stanzas[0]?.lines?.length).toBe(3);
      const lines = haiku.stanzas[0]?.lines ?? [];
      // Lines should be present, syllable counting is approximate
      expect(lines[0]?.length).toBeGreaterThan(0);
      expect(lines[1]?.length).toBeGreaterThan(0);
      expect(lines[2]?.length).toBeGreaterThan(0);
    });

    it('should generate title from focal points', () => {
      const entry = createTestEntry({
        perception: {
          initialImpression: 'Something seen',
          elements: [],
          atmosphere: ['clear' as Atmosphere],
          focalPoints: ['the cathedral window'],
          patterns: [],
          lens: 'aesthetic'
        }
      });
      
      const poem = visionToPoetry(entry);
      expect(poem.title).toContain('cathedral window');
    });

    it('should track vision ID in generated poem', () => {
      const entry = createTestEntry({ id: 'vision_abc_123' });
      const poem = visionToPoetry(entry);
      
      expect(poem.visionId).toBe('vision_abc_123');
    });

    it('should generate poems with different tones', () => {
      const entry = createTestEntry();
      
      const vivid = visionToPoetry(entry, { tone: 'vivid', form: 'free_verse' });
      expect(vivid).toBeDefined();
      expect(vivid.stanzas.length).toBeGreaterThan(0);
      
      const minimal = visionToPoetry(entry, { tone: 'minimal', form: 'free_verse' });
      expect(minimal).toBeDefined();
      expect(minimal.stanzas.length).toBeGreaterThan(0);
    });
    
    it('should handle entries with missing data gracefully', () => {
      const entry = createTestEntry({
        perception: {
          initialImpression: 'Something',
          elements: [],
          atmosphere: [],
          focalPoints: [],
          patterns: [],
          lens: 'intuitive'
        },
        reflection: {
          meaning: 'Simple meaning',
          associations: [],
          questions: []
        }
      });
      
      const poem = visionToPoetry(entry);
      expect(poem.stanzas.length).toBeGreaterThan(0);
    });
  });

  describe('formatPoem', () => {
    it('should format a poem as a string', () => {
      const poem: VisionPoem = {
        title: 'Threshold',
        stanzas: [
          {
            lines: ['line one', 'line two'],
            form: 'free_verse',
            source: 'elements'
          }
        ],
        form: 'free_verse',
        visionId: 'v1',
        generatedAt: new Date().toISOString()
      };
      
      const formatted = formatPoem(poem);
      expect(formatted).toContain('THRESHOLD');
      expect(formatted).toContain('line one');
      expect(formatted).toContain('line two');
    });

    it('should include reflection when present', () => {
      const poem: VisionPoem = {
        title: 'Test',
        stanzas: [],
        form: 'free_verse',
        visionId: 'v1',
        generatedAt: new Date().toISOString(),
        reflection: 'A reflection on seeing'
      };
      
      const formatted = formatPoem(poem);
      expect(formatted).toContain('A reflection on seeing');
    });
    
    it('should handle empty stanzas gracefully', () => {
      const poem: VisionPoem = {
        title: 'Empty',
        stanzas: [],
        form: 'free_verse',
        visionId: 'v1',
        generatedAt: new Date().toISOString()
      };
      
      const formatted = formatPoem(poem);
      expect(formatted).toContain('EMPTY');
    });
  });

  describe('batchVisionToPoetry', () => {
    it('should process multiple entries', () => {
      const entries = [
        createTestEntry({ id: 'v1' }),
        createTestEntry({ id: 'v2' }),
        createTestEntry({ id: 'v3' })
      ];
      
      const poems = batchVisionToPoetry(entries);
      expect(poems).toHaveLength(3);
      expect(poems[0]?.visionId).toBe('v1');
      expect(poems[1]?.visionId).toBe('v2');
      expect(poems[2]?.visionId).toBe('v3');
    });

    it('should apply options to all entries', () => {
      const entries = [createTestEntry(), createTestEntry()];
      const poems = batchVisionToPoetry(entries, { form: 'haiku' });
      
      expect(poems.every(p => p.form === 'haiku')).toBe(true);
    });
  });
});
