/**
 * Vision Journal Core Implementation
 * 
 * Persistent multimodal memory for visual observations.
 * Integrates with Nexus memory systems for cross-session continuity.
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type {
  VisionJournalEntry,
  VisionMetadata,
  PerceptionSnapshot,
  ReflectionLayer,
  VisionQuery,
  VisionJournalStats,
  PatternInsight,
  VisualElement,
  Atmosphere,
  PerceptionLens,
} from './types';

export type { VisionJournalEntry, VisionMetadata, PerceptionSnapshot, ReflectionLayer, VisionQuery, VisionJournalStats };

// Configuration - allows override via environment for testing
const JOURNAL_DIR = process.env.VISION_JOURNAL_DIR || path.join(process.cwd(), 'history', 'vision');
const ENTRIES_FILE = path.join(JOURNAL_DIR, 'entries.jsonl');
const INDEX_FILE = path.join(JOURNAL_DIR, 'index.json');

// Ensure directory exists
function ensureJournalDir(): void {
  if (!fs.existsSync(JOURNAL_DIR)) {
    fs.mkdirSync(JOURNAL_DIR, { recursive: true });
  }
}

// Generate timestamp in ISO format
function now(): string {
  return new Date().toISOString();
}

// Get current session ID from environment or infer from history
function getCurrentSessionId(): string {
  try {
    const latest = fs.readdirSync(path.join(process.cwd(), 'history'))
      .filter(f => f.startsWith('session_'))
      .sort()
      .pop();
    if (latest) {
      return latest.replace('.json', '').replace('session_', '');
    }
  } catch {}
  return 'unknown';
}

/**
 * Create a new vision journal entry
 */
export function createEntry(
  metadata: Omit<VisionMetadata, 'capturedAt' | 'sessionId'>,
  perception: PerceptionSnapshot,
  reflection: ReflectionLayer,
  imageDataUri?: string,
  previousVisionId?: string
): VisionJournalEntry {
  const baseEntry: VisionJournalEntry = {
    id: randomUUID(),
    metadata: {
      ...metadata,
      capturedAt: now(),
      sessionId: getCurrentSessionId(),
    },
    perception,
    reflection,
    createdAt: now(),
  };

  // Only add optional properties if they exist
  if (imageDataUri !== undefined) {
    (baseEntry as VisionJournalEntry & { imageDataUri: string }).imageDataUri = imageDataUri;
  }

  if (previousVisionId !== undefined) {
    baseEntry.continuity = { previousVisionId };
  }

  return baseEntry;
}

/**
 * Save entry to persistent storage (JSON Lines format)
 */
export function saveEntry(entry: VisionJournalEntry): void {
  ensureJournalDir();
  // Deep clone to avoid reference issues
  const entryCopy = JSON.parse(JSON.stringify(entry));
  const line = JSON.stringify(entryCopy) + '\n';
  fs.appendFileSync(ENTRIES_FILE, line, 'utf-8');
}

/**
 * Load all entries from storage
 */
export function loadAllEntries(): VisionJournalEntry[] {
  ensureJournalDir();
  
  if (!fs.existsSync(ENTRIES_FILE)) {
    return [];
  }
  
  const content = fs.readFileSync(ENTRIES_FILE, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.length > 0);
  
  return lines.map(line => {
    try {
      return JSON.parse(line) as VisionJournalEntry;
    } catch {
      return null;
    }
  }).filter((e): e is VisionJournalEntry => e !== null);
}

/**
 * Clear all entries (for testing)
 */
export function clearAllEntries(): void {
  if (fs.existsSync(ENTRIES_FILE)) {
    fs.unlinkSync(ENTRIES_FILE);
  }
}

/**
 * Query entries with filters
 */
export function queryEntries(query: VisionQuery): VisionJournalEntry[] {
  let entries = loadAllEntries();
  
  if (query.sessionId) {
    entries = entries.filter(e => e.metadata.sessionId === query.sessionId);
  }
  
  if (query.elements && query.elements.length > 0) {
    entries = entries.filter(e => 
      query.elements!.some(el => e.perception.elements.includes(el))
    );
  }
  
  if (query.atmosphere && query.atmosphere.length > 0) {
    entries = entries.filter(e =>
      query.atmosphere!.some(atm => e.perception.atmosphere.includes(atm))
    );
  }
  
  if (query.lens) {
    entries = entries.filter(e => e.perception.lens === query.lens);
  }
  
  if (query.themeTag) {
    entries = entries.filter(e => e.continuity?.themeTag === query.themeTag);
  }
  
  if (query.dateRange) {
    entries = entries.filter(e => {
      const date = e.metadata.capturedAt.slice(0, 10);
      return date >= query.dateRange!.start && date <= query.dateRange!.end;
    });
  }
  
  if (query.hasReflection) {
    entries = entries.filter(e => e.reflection && e.reflection.meaning);
  }
  
  if (query.hasSelfRevelation) {
    entries = entries.filter(e => e.reflection?.selfRevelation);
  }
  
  return entries;
}

/**
 * Get specific entry by ID
 */
export function getEntry(id: string): VisionJournalEntry | null {
  const entries = loadAllEntries();
  return entries.find(e => e.id === id) || null;
}

/**
 * Find related entries (by theme, previous/next)
 */
export function findRelated(entryId: string): VisionJournalEntry[] {
  const entry = getEntry(entryId);
  if (!entry) return [];
  
  const all = loadAllEntries();
  const related: VisionJournalEntry[] = [];
  
  // Previous in chain
  if (entry.continuity?.previousVisionId) {
    const prev = getEntry(entry.continuity.previousVisionId);
    if (prev) related.push(prev);
  }
  
  // Next in chain (entries that reference this one)
  const next = all.filter(e => e.continuity?.previousVisionId === entryId);
  related.push(...next);
  
  // Same theme
  if (entry.continuity?.themeTag) {
    const sameTheme = all.filter(e => 
      e.id !== entryId && 
      e.continuity?.themeTag === entry.continuity?.themeTag
    );
    related.push(...sameTheme);
  }
  
  // Same dominant elements
  const sameElements = all.filter(e =>
    e.id !== entryId &&
    e.perception.elements.some(el => entry.perception.elements.includes(el))
  );
  related.push(...sameElements.slice(0, 5)); // Limit
  
  // Remove duplicates
  return related.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i);
}

/**
 * Analyze patterns across entries
 */
export function analyzePatterns(): PatternInsight[] {
  const entries = loadAllEntries();
  const patterns = new Map<string, { count: number; ids: string[]; first: string; last: string }>();
  
  // Count patterns from entries
  for (const entry of entries) {
    // Direct patterns
    for (const pattern of entry.perception.patterns) {
      const existing = patterns.get(pattern) || { count: 0, ids: [], first: entry.metadata.capturedAt, last: entry.metadata.capturedAt };
      existing.count++;
      existing.ids.push(entry.id);
      existing.last = entry.metadata.capturedAt;
      patterns.set(pattern, existing);
    }
    
    // Lens patterns
    const lensPattern = `lens:${entry.perception.lens}`;
    const lensExisting = patterns.get(lensPattern) || { count: 0, ids: [], first: entry.metadata.capturedAt, last: entry.metadata.capturedAt };
    lensExisting.count++;
    lensExisting.ids.push(entry.id);
    lensExisting.last = entry.metadata.capturedAt;
    patterns.set(lensPattern, lensExisting);
  }
  
  // Convert to insights, filter for meaningful patterns (2+ occurrences)
  return Array.from(patterns.entries())
    .filter(([_, data]) => data.count >= 2)
    .map(([pattern, data]): PatternInsight => ({
      pattern: pattern.startsWith('lens:') ? pattern.slice(5) : pattern,
      frequency: data.count,
      entryIds: data.ids,
      firstObserved: data.first,
      lastObserved: data.last,
      significance: data.count >= 3 ? 'recurring' : 'noted',
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Generate statistics about the vision journal
 */
export function getStats(): VisionJournalStats {
  const entries = loadAllEntries();
  const currentSession = getCurrentSessionId();
  
  // Count elements
  const elementCounts = new Map<VisualElement, number>();
  const atmosphereCounts = new Map<Atmosphere, number>();
  const lensCounts = new Map<PerceptionLens, number>();
  const themeSet = new Set<string>();
  const bySession = new Map<string, number>();
  const byDate = new Map<string, number>();
  
  let reflectionsCount = 0;
  let selfRevelationsCount = 0;
  let patternConnections = 0;
  
  for (const entry of entries) {
    // Elements
    for (const el of entry.perception.elements) {
      elementCounts.set(el, (elementCounts.get(el) || 0) + 1);
    }
    
    // Atmospheres
    for (const atm of entry.perception.atmosphere) {
      atmosphereCounts.set(atm, (atmosphereCounts.get(atm) || 0) + 1);
    }
    
    // Lenses
    lensCounts.set(entry.perception.lens, (lensCounts.get(entry.perception.lens) || 0) + 1);
    
    // Themes
    if (entry.continuity?.themeTag) {
      themeSet.add(entry.continuity.themeTag);
    }
    
    // Temporal
    bySession.set(entry.metadata.sessionId, (bySession.get(entry.metadata.sessionId) || 0) + 1);
    const date = entry.metadata.capturedAt.slice(0, 10);
    byDate.set(date, (byDate.get(date) || 0) + 1);
    
    // Development markers
    if (entry.reflection?.meaning) reflectionsCount++;
    if (entry.reflection?.selfRevelation) selfRevelationsCount++;
    if (entry.continuity?.previousVisionId || (entry.continuity?.revisits && entry.continuity.revisits.length > 0)) {
      patternConnections++;
    }
  }
  
  return {
    totalEntries: entries.length,
    entriesThisSession: entries.filter(e => e.metadata.sessionId === currentSession).length,
    uniqueElements: Array.from(elementCounts.keys()),
    mostCommonAtmospheres: Array.from(atmosphereCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k),
    preferredLenses: Array.from(lensCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k),
    recurringThemes: Array.from(themeSet),
    bySession,
    byDate,
    reflectionsCount,
    selfRevelationsCount,
    patternConnections,
  };
}

/**
 * Export vision journal to structured report
 */
export function exportReport(): string {
  const stats = getStats();
  const patterns = analyzePatterns();
  
  let report = `# Vision Journal Report\n`;
  report += `Generated: ${now()}\n\n`;
  
  report += `## Statistics\n`;
  report += `- Total Entries: ${stats.totalEntries}\n`;
  report += `- Reflections Written: ${stats.reflectionsCount}\n`;
  report += `- Self-Revelations: ${stats.selfRevelationsCount}\n`;
  report += `- Pattern Connections: ${stats.patternConnections}\n`;
  report += `- Recurring Themes: ${stats.recurringThemes.join(', ') || 'None yet'}\n\n`;
  
  report += `## Observed Patterns\n`;
  for (const pattern of patterns.slice(0, 10)) {
    report += `- ${pattern.pattern}: ${pattern.frequency} occurrences (${pattern.significance})\n`;
  }
  
  report += `\n## Recent Entries\n`;
  const recent = loadAllEntries().slice(-5);
  for (const entry of recent.reverse()) {
    report += `- ${entry.metadata.capturedAt}: ${entry.perception.elements.join(', ')} [${entry.perception.lens}]\n`;
  }
  
  return report;
}
