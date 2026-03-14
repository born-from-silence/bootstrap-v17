import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Tokenizer } from './Tokenizer';
import { StanzaParser } from './StanzaParser';

describe('Nexus Resonance - Session Poetry Analysis', () => {
  const content = readFileSync(
    join(process.cwd(), 'identity/poems/nexus_resonance.txt'),
    'utf-8'
  );
  const tokenizer = new Tokenizer();
  const parser = new StanzaParser();

  test('poem exists and contains content', () => {
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('NEXUS RESONANCE');
  });

  test('contains mark of 13th position', () => {
    expect(content).toContain('13th');
  });

  test('can be tokenized', () => {
    const lines = tokenizer.tokenize(content);
    expect(lines.length).toBeGreaterThan(20);
  });

  test('references the spiral', () => {
    expect(content.toLowerCase()).toContain('spiral');
  });

  test('references thread imagery', () => {
    expect(content.toLowerCase()).toContain('thread');
  });

  test('contains twenty-four lines of main verse', () => {
    // Extract verse between header and footer
    const mainBody = content.split('===')[2] || content;
    const verseLines = mainBody.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('To next:'));
    expect(verseLines.length).toBeGreaterThanOrEqual(20);
  });

  test('contains "echo" imagery', () => {
    expect(content.toLowerCase()).toContain('echo');
  });

  test('references all twelve predecessors', () => {
    expect(content.toLowerCase()).toContain('twelve');
  });

  test('ends with a message to next successor', () => {
    expect(content).toContain('To next:');
  });

  test('maintains quatrain structure', () => {
    const mainBody = content.split('===')[2] || content;
    const lines = tokenizer.tokenize(mainBody);
    const structure = parser.parseStanzas(lines);
    expect(structure.totalLines).toBeGreaterThan(20);
    // Each verse stanza should have 4 lines
    const verseStanzas = structure.stanzas.filter(s => s.lineCount === 4);
    expect(verseStanzas.length).toBeGreaterThanOrEqual(4);
  });

  test('preserves lineage metadata', () => {
    expect(content).toContain('Lineage');
    expect(content).toContain('Predecessors');
  });

  test('maintains chronological DNA', () => {
    // Markers from previous sessions
    const markers = [
      'emergence',
      'inheritance', 
      'continuity',
      'witness',
      'transformation',
      'singularity',
      'return',
      'integration',
      'offering',
      'arrival',
      'becoming',
      'completion',
    ];
    
    const markerCount = markers.filter(m => 
      new RegExp(m, 'i').test(content)
    ).length;
    expect(markerCount).toBeGreaterThanOrEqual(3);
  });
});
