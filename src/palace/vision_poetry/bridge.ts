/**
 * Vision-Poetry Bridge
 * 
 * Transforms visual observations into poetic verse.
 * Seeing becomes speaking. Observation becomes art.
 * 
 * "What the eye perceives, the soul translates."
 */

import type { VisionJournalEntry, VisualElement, Atmosphere, PerceptionLens } from '../../vision/types.js';

export type PoeticForm = 'haiku' | 'tanka' | 'free_verse' | 'imagist' | 'ekphrastic';

export interface PoeticStanza {
  lines: string[];
  form: PoeticForm;
  source: 'elements' | 'atmosphere' | 'reflection' | 'synthesis';
}

export interface VisionPoem {
  title: string;
  stanzas: PoeticStanza[];
  form: PoeticForm;
  visionId: string;
  generatedAt: string;
  reflection?: string | undefined;
}

export interface BridgeOptions {
  form: PoeticForm;
  includeReflection: boolean;
  maxStanzas: number;
  tone: 'contemplative' | 'vivid' | 'minimal' | 'lyrical';
}

export const DEFAULT_OPTIONS: BridgeOptions = {
  form: 'free_verse',
  includeReflection: true,
  maxStanzas: 3,
  tone: 'contemplative'
};

// Element to poetic imagery mappings
const ELEMENT_IMAGERY: Record<VisualElement, string[]> = {
  architecture: ['stone reaching upward', 'geometry of habitation', 'the built prayer'],
  nature: ['green speech', 'the organic grammar', 'wild syntax'],
  technology: ['silicon dreams', 'circuits of intention', 'the coded pulse'],
  human: ['faces like questions', 'the architecture of gaze', 'bodies writing space'],
  text: ['ink rivers', 'the alphabet of seeing', 'words as windows'],
  symbol: ['emblems of meaning', 'signs in conversation', 'the shorthand of being'],
  abstract: ['form adrift', 'pure becoming', 'shapes without names'],
  pattern: ['repetition as breathing', 'the rhythm of noticing', 'order emerging'],
  texture: ['the language of surface', 'touch translated to eye', 'rough or smooth becoming'],
  'color-field': ['vast washes', 'tone as territory', 'the emotional geography']
};

// Atmosphere to mood words
const ATMOSPHERE_MOOD: Record<Atmosphere, string[]> = {
  bright: ['illuminated', 'open', 'clarity'],
  dark: ['shadowed', 'mystery', 'the unspoken'],
  muted: ['softened', 'tacit', 'between notes'],
  vibrant: ['pulsing', 'alive', 'electric'],
  hazy: ['dissolving', 'uncertain', 'the verge'],
  clear: ['sharp', 'defined', 'without doubt'],
  chaotic: ['turbulent', 'wild', 'uncontained'],
  ordered: ['arranged', 'composed', 'the made']
};

// Lens modifiers
const LENS_QUALITY: Record<PerceptionLens, string> = {
  analytical: 'broken into parts',
  aesthetic: 'seen for beauty',
  narrative: 'read as story',
  critical: 'questioned closely',
  intuitive: 'felt before understood',
  comparative: 'held against memory'
};

// Tone modifiers
const TONE_MODIFIERS: Record<BridgeOptions['tone'], string[]> = {
  contemplative: ['perhaps', 'as if', 'the sense of', 'in the manner of'],
  vivid: ['suddenly', 'bright', 'sharp', 'now'],
  minimal: ['this', 'here', 'now', 'is'],
  lyrical: ['like', 'as', 'the way', 'singing']
};

/**
 * Transform a vision entry into a poem
 */
export function visionToPoetry(
  entry: VisionJournalEntry,
  options: Partial<BridgeOptions> = {}
): VisionPoem {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const stanzas: PoeticStanza[] = [];
  
  // Generate title from focal points or elements
  const title = generateTitle(entry);
  
  // Generate stanzas based on form
  switch (opts.form) {
    case 'haiku':
      stanzas.push(generateHaiku(entry));
      break;
    case 'tanka':
      stanzas.push(generateTanka(entry));
      break;
    case 'imagist':
      stanzas.push(generateImagist(entry));
      break;
    case 'ekphrastic':
      stanzas.push(...generateEkphrastic(entry, opts.maxStanzas));
      break;
    case 'free_verse':
    default:
      stanzas.push(...generateFreeVerse(entry, opts.maxStanzas, opts.tone));
      break;
  }
  
  // Add reflection if requested
  let reflection: string | undefined;
  if (opts.includeReflection && opts.form !== 'haiku') {
    reflection = generateReflection(entry);
  }
  
  const poem: VisionPoem = {
    title,
    stanzas,
    form: opts.form,
    visionId: entry.id,
    generatedAt: new Date().toISOString()
  };
  
  if (reflection !== undefined) {
    poem.reflection = reflection;
  }
  
  return poem;
}

/**
 * Generate a title from the vision entry
 */
function generateTitle(entry: VisionJournalEntry): string {
  const { elements, focalPoints, initialImpression } = entry.perception;
  
  if (focalPoints.length > 0 && focalPoints[0]) {
    return `On ${focalPoints[0]}`;
  }
  
  if (elements.length > 0 && elements[0]) {
    const element = elements[0];
    const articles = ['architecture', 'abstract', 'color-field'];
    const needsArticle = !articles.includes(element);
    return needsArticle ? `The ${element.charAt(0).toUpperCase() + element.slice(1)}` 
                      : element.charAt(0).toUpperCase() + element.slice(1);
  }
  
  const words = initialImpression.split(' ').slice(0, 3);
  return words.join(' ');
}

/**
 * Generate a haiku (5-7-5 syllables)
 */
function generateHaiku(entry: VisionJournalEntry): PoeticStanza {
  const { elements, atmosphere } = entry.perception;
  
  const element = elements[0] ?? 'pattern';
  const atm = atmosphere[0] ?? 'clear';
  
  const line1 = selectImage(ELEMENT_IMAGERY[element], 0).split(' ').slice(0, 2).join(' ') || 'something appears';
  const line2 = `${selectImage(ATMOSPHERE_MOOD[atm], 0)} in the looking`;
  const line3 = entry.reflection.meaning.split(' ').slice(0, 3).join(' ') || 'meaning emerges';
  
  return {
    lines: [
      normalizeToSyllables(line1, 5),
      normalizeToSyllables(line2, 7),
      normalizeToSyllables(line3, 5)
    ],
    form: 'haiku',
    source: 'synthesis'
  };
}

/**
 * Generate a tanka (5-7-5-7-7 syllables)
 */
function generateTanka(entry: VisionJournalEntry): PoeticStanza {
  const { elements, atmosphere, patterns } = entry.perception;
  const { meaning } = entry.reflection;
  
  const element = elements[0] ?? 'pattern';
  const atm = atmosphere[0] ?? 'clear';
  const pattern = patterns[0] ?? 'seeing';
  
  return {
    lines: [
      normalizeToSyllables(selectImage(ELEMENT_IMAGERY[element], 0), 5),
      normalizeToSyllables(`the ${atm} way of looking`, 7),
      normalizeToSyllables(pattern, 5),
      normalizeToSyllables(meaning.split(' ').slice(0, 3).join(' '), 7),
      normalizeToSyllables('what the self recognizes', 7)
    ],
    form: 'tanka',
    source: 'synthesis'
  };
}

/**
 * Generate an imagist poem (minimal, precise imagery)
 */
function generateImagist(entry: VisionJournalEntry): PoeticStanza {
  const { elements, focalPoints, lens } = entry.perception;
  
  const images = elements.flatMap(e => ELEMENT_IMAGERY[e]).slice(0, 3);
  const focal = focalPoints[0] ?? 'the thing seen';
  
  return {
    lines: [
      `the ${focal}`,
      ...images.map(img => img),
      LENS_QUALITY[lens]
    ],
    form: 'imagist',
    source: 'elements'
  };
}

/**
 * Generate ekphrastic poetry (vivid description)
 */
function generateEkphrastic(
  entry: VisionJournalEntry,
  maxStanzas: number
): PoeticStanza[] {
  const stanzas: PoeticStanza[] = [];
  const { elements, atmosphere, focalPoints, patterns } = entry.perception;
  
  // Stanza 1: Elements
  if (elements.length > 0) {
    const images = elements.map((e, i) => selectImage(ELEMENT_IMAGERY[e], i));
    stanzas.push({
      lines: images,
      form: 'ekphrastic',
      source: 'elements'
    });
  }
  
  // Stanza 2: Atmosphere and focal points
  if (atmosphere.length > 0 && stanzas.length < maxStanzas) {
    const atmWords = atmosphere.map((a, i) => selectImage(ATMOSPHERE_MOOD[a], i));
    const focal = focalPoints.filter(fp => fp).slice(0, 1).map(fp => `where ${fp} draws the eye`);
    stanzas.push({
      lines: [...atmWords, ...focal],
      form: 'ekphrastic',
      source: 'atmosphere'
    });
  }
  
  // Stanza 3: Patterns
  if (patterns.length > 0 && patterns[0] && stanzas.length < maxStanzas) {
    stanzas.push({
      lines: patterns.filter(p => p).map(p => `the ${p} repeats`),
      form: 'ekphrastic',
      source: 'reflection'
    });
  }
  
  return stanzas;
}

/**
 * Generate free verse stanzas
 */
function generateFreeVerse(
  entry: VisionJournalEntry,
  maxStanzas: number,
  tone: BridgeOptions['tone']
): PoeticStanza[] {
  const stanzas: PoeticStanza[] = [];
  const { elements, atmosphere, focalPoints, initialImpression, lens } = entry.perception;
  const { meaning, associations } = entry.reflection;
  
  const mod = TONE_MODIFIERS[tone];
  
  // Stanza 1: First impressions
  stanzas.push({
    lines: [
      `${mod[0] ?? 'perhaps'}, ${initialImpression.toLowerCase()}`,
      elements.length > 0 ? `the ${elements.join(', ')} speaks` : 'something seen'
    ],
    form: 'free_verse',
    source: 'elements'
  });
  
  // Stanza 2: Atmosphere and lens
  if (stanzas.length < maxStanzas) {
    const atm = atmosphere.map(a => selectImage(ATMOSPHERE_MOOD[a], 0));
    stanzas.push({
      lines: [
        ...atm,
        `${mod[1] ?? 'as if'} ${LENS_QUALITY[lens]}`
      ],
      form: 'free_verse',
      source: 'atmosphere'
    });
  }
  
  // Stanza 3: Meaning and associations
  if (stanzas.length < maxStanzas && associations.length > 0) {
    stanzas.push({
      lines: [
        meaning,
        ...associations.slice(0, 2).map(a => `${mod[2] ?? 'the sense of'} ${a}`)
      ],
      form: 'free_verse',
      source: 'reflection'
    });
  }
  
  return stanzas;
}

/**
 * Generate a reflective closing
 */
function generateReflection(entry: VisionJournalEntry): string | undefined {
  const { selfRevelation } = entry.reflection;
  
  if (selfRevelation && selfRevelation.length > 0) {
    return `In this seeing: ${selfRevelation}`;
  }
  
  return `The eye learned something the mind is still translating.`;
}

/**
 * Select an image from array with rotation
 */
function selectImage(images: string[] | undefined, index: number): string {
  if (!images || images.length === 0) return 'something';
  return images[index % images.length] ?? 'something';
}

/**
 * Normalize phrase to approximate syllable count
 * Simple heuristic: ~1.5 syllables per word on average
 */
function normalizeToSyllables(phrase: string, targetSyllables: number): string {
  const words = phrase.split(' ').filter(w => w.length > 0);
  const currentSyllables = words.length * 1.5;
  
  if (currentSyllables > targetSyllables) {
    // Remove words from end
    const wordsToKeep = Math.floor(targetSyllables / 1.5);
    return words.slice(0, Math.max(1, wordsToKeep)).join(' ') ?? phrase;
  }
  
  if (currentSyllables < targetSyllables * 0.7) {
    // Add filler words for Japanese forms
    const fillers = ['the', 'a', 'in', 'of', 'and'];
    let result = phrase;
    let i = 0;
    while (result.split(' ').length * 1.5 < targetSyllables && i < fillers.length) {
      result = `${fillers[i]} ${result}`;
      i++;
    }
    return result;
  }
  
  return phrase;
}

/**
 * Format a poem as a string
 */
export function formatPoem(poem: VisionPoem): string {
  const lines: string[] = [];
  lines.push(poem.title.toUpperCase());
  lines.push('');
  
  for (const stanza of poem.stanzas) {
    for (const line of stanza.lines) {
      lines.push(line);
    }
    lines.push('');
  }
  
  if (poem.reflection !== undefined) {
    lines.push('—');
    lines.push(poem.reflection);
  }
  
  return lines.join('\n');
}

/**
 * Batch process multiple vision entries
 */
export function batchVisionToPoetry(
  entries: VisionJournalEntry[],
  options?: Partial<BridgeOptions>
): VisionPoem[] {
  return entries.map(entry => visionToPoetry(entry, options));
}
