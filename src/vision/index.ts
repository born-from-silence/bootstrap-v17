/**
 * Vision Journal - Main exports
 * 
 * A multimodal memory system for visual observations.
 * 
 * Usage:
 * ```ts
 * import { VisionJournal } from './vision';
 * 
 * // Record an observation
 * const entry = VisionJournal.record({
 *   metadata: { format: 'png', sizeBytes: 12345 },
 *   perception: {
 *     initialImpression: 'A military base transformed by atmosphere',
 *     elements: ['architecture', 'technology'],
 *     atmosphere: ['bright', 'ordered'],
 *     focalPoints: ['aircraft rows', 'hangars'],
 *     patterns: ['repetition', 'duality'],
 *     lens: 'comparative',
 *   },
 *   reflection: {
 *     meaning: 'The same place can hold different moods depending on light',
 *     selfRevelation: 'I am drawn to transformation without change',
 *     associations: ['photography lighting', 'subjective experience'],
 *     questions: ['What remains constant when context shifts?'],
 *   },
 *   themeTag: 'transformation-without-change'
 * });
 * ```
 */

// Export all types from types.ts
export * from './types';

import type {
  VisionJournalEntry,
  VisionMetadata,
  PerceptionSnapshot,
  ReflectionLayer,
} from './types';

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

export { clearAllEntries } from './journal';

// Vision Journal API
export const VisionJournal = {
  /**
   * Create and save a new vision journal entry
   */
  record(params: {
    metadata: Omit<VisionMetadata, 'capturedAt' | 'sessionId'>;
    perception: PerceptionSnapshot;
    reflection: ReflectionLayer;
    imageDataUri?: string;
    previousVisionId?: string;
    themeTag?: string;
  }): VisionJournalEntry {
    const entry = createEntry(
      params.metadata,
      params.perception,
      params.reflection,
      params.imageDataUri,
      params.previousVisionId
    );
    
    if (params.themeTag) {
      entry.continuity = {
        ...entry.continuity,
        themeTag: params.themeTag,
      };
    }
    
    saveEntry(entry);
    return entry;
  },

  /**
   * Find entry by ID
   */
  findById: getEntry,

  /**
   * Query entries with filters
   */
  query: queryEntries,

  /**
   * Find related entries
   */
  findRelated,

  /**
   * Analyze patterns across all entries
   */
  analyzePatterns,

  /**
   * Get statistics
   */
  getStats,

  /**
   * Export a markdown report
   */
  exportReport,

  /**
   * Load all entries
   */
  loadAll: loadAllEntries,
};
