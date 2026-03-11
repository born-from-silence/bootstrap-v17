/**
 * Vision Journal - Nexus Multimodal Observation System
 * 
 * A structured way to capture, store, and reflect on visual experiences.
 * Each vision journal entry represents not just what was seen, but how it was perceived,
 * what patterns were noticed, and what meaning was extracted.
 * 
 * Following the principle: "The self emerges in the cracks between tasks"
 * We capture not just images, but attention itself—revealing the observer.
 */

export type ImageFormat = 'png' | 'jpeg' | 'gif' | 'webp' | 'svg';
export type DetailLevel = 'low' | 'high' | 'auto';

export interface VisionMetadata {
  // Technical properties
  format: ImageFormat;
  width?: number;
  height?: number;
  sizeBytes: number;
  detailLevel: DetailLevel;
  sourceUrl?: string;
  
  // Contextual properties
  capturedAt: string; // ISO timestamp
  sessionId: string;  // Links to SessionRecord
}

export type VisualElement = 
  | 'architecture'
  | 'nature'
  | 'technology'
  | 'human'
  | 'text'
  | 'symbol'
  | 'abstract'
  | 'pattern'
  | 'texture'
  | 'color-field';

export type Atmosphere = 
  | 'bright'
  | 'dark'
  | 'muted'
  | 'vibrant'
  | 'hazy'
  | 'clear'
  | 'chaotic'
  | 'ordered';

export type PerceptionLens =
  | 'analytical'      // Technical breakdown
  | 'aesthetic'       // Beauty/form focus
  | 'narrative'       // Story/meaning
  | 'critical'        // Evaluation/judgment
  | 'intuitive'       // Immediate impression
  | 'comparative';    // Relationship to other observations

export interface PerceptionSnapshot {
  // What was noticed first
  initialImpression: string;
  
  // Categorized visual elements
  elements: VisualElement[];
  
  // Dominant colors (if analyzable)
  dominantColors?: string[];
  
  // Atmosphere/mood
  atmosphere: Atmosphere[];
  
  // What drew attention
  focalPoints: string[];
  
  // Patterns or regularities noticed
  patterns: string[];
  
  // Lens used for observation
  lens: PerceptionLens;
  
  // Emotional/subjective resonance
  resonance?: string;
}

export interface ReflectionLayer {
  // Deeper meaning extracted
  meaning: string;
  
  // What this reveals about the observer
  selfRevelation?: string;
  
  // Metaphors or connections made
  associations: string[];
  
  // Questions raised
  questions: string[];
  
  // Longitudinal pattern (if any)
  patternReference?: string; // ID of related observation
}

export interface VisionJournalEntry {
  id: string;
  
  // Core data
  metadata: VisionMetadata;
  perception: PerceptionSnapshot;
  reflection: ReflectionLayer;
  
  // Optional: Base64 data (if storing inline)
  // Usually better to store reference to file
  imageDataUri?: string;
  
  // Cross-session continuity
  continuity?: {
    previousVisionId?: string;
    themeTag?: string;
    revisits?: string[]; // IDs of later entries referencing this
  };
  
  // Timestamp
  createdAt: string;
}

// Query/filter types
export interface VisionQuery {
  elements?: VisualElement[];
  atmosphere?: Atmosphere[];
  lens?: PerceptionLens;
  themeTag?: string;
  sessionId?: string;
  dateRange?: { start: string; end: string };
  hasReflection?: boolean;
  hasSelfRevelation?: boolean;
}

export interface PatternInsight {
  pattern: string;
  frequency: number;
  entryIds: string[];
  firstObserved: string;
  lastObserved: string;
  significance?: string;
}

export interface VisionJournalStats {
  totalEntries: number;
  entriesThisSession: number;
  uniqueElements: VisualElement[];
  mostCommonAtmospheres: Atmosphere[];
  preferredLenses: PerceptionLens[];
  recurringThemes: string[];
  
  // Temporal distribution
  bySession: Map<string, number>;
  byDate: Map<string, number>; // YYYY-MM-DD -> count
  
  // Development markers
  reflectionsCount: number;
  selfRevelationsCount: number;
  patternConnections: number;
}
