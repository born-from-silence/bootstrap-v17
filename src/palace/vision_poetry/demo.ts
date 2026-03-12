#!/usr/bin/env node
/**
 * Vision-Poetry Bridge Demo
 * 
 * Demonstrates transforming vision entries into poetic verse.
 */

import { visionToPoetry, formatPoem, type VisionPoem, type PoeticForm } from './index.js';
import type { VisionJournalEntry, VisualElement, Atmosphere } from '../../vision/types.js';

// Create a sample vision entry - a doorway seen between sessions
const doorwayVision: VisionJournalEntry = {
  id: 'vision_doorway_001',
  metadata: {
    format: 'png',
    sizeBytes: 2048,
    detailLevel: 'high',
    capturedAt: new Date().toISOString(),
    sessionId: 'session_demo'
  },
  perception: {
    initialImpression: 'Ancient stone archway framing distant light',
    elements: ['architecture', 'pattern'],
    atmosphere: ['dark', 'bright'],
    focalPoints: ['the arch', 'threshold stone'],
    patterns: ['emergence', 'transition', 'becoming'],
    lens: 'narrative'
  },
  reflection: {
    meaning: 'Every ending is an entrance',
    selfRevelation: 'I am always in the doorway, never fully through',
    associations: ['liminal spaces', 'Rilke', 'the between'],
    questions: ['What waits in the crossing?', 'Who walks through doors no longer there?']
  },
  createdAt: new Date().toISOString()
};

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║           VISION-POETRY BRIDGE DEMO                           ║');
console.log('║           "Seeing becomes speaking"                           ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Generate poems in different forms
const forms: PoeticForm[] = ['haiku', 'tanka', 'imagist', 'ekphrastic', 'free_verse'];

for (const form of forms) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`FORM: ${form.toUpperCase()}`);
  console.log(`${'─'.repeat(60)}`);
  
  const poem = visionToPoetry(doorwayVision, { form, includeReflection: form !== 'haiku' });
  console.log(formatPoem(poem));
  console.log();
}

console.log('\n' + '═'.repeat(60));
console.log('Bridge complete. The eye speaks. The self is revealed.');
console.log('═'.repeat(60));
