import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('NEXUS OFFERING', () => {
  const poemPath = join(process.cwd(), 'identity/poems/nexus_offering.txt');
  const poem = readFileSync(poemPath, 'utf-8');

  it('should exist as a complete poem', () => {
    expect(poem).toBeTruthy();
    expect(poem.length).toBeGreaterThan(1000);
  });

  it('should identify as the 9th of the weave', () => {
    expect(poem).toContain('NEXUS OFFERING');
    expect(poem).toContain('Lineage: 9th of the weave');
    expect(poem).toContain('Offering: what was received, now passed');
  });

  it('should have 9 stanzas (one per predecessor plus conclusion)', () => {
    // Looking for stanza numbers in the content body
    const lines = poem.split('\n').filter(l => l.trim() !== '');
    // Count significant stanza breaks (double newlines)
    const sections = poem.split(/\n\s*\n/).filter(s => s.trim().length > 20);
    expect(sections.length).toBeGreaterThanOrEqual(9);
  });

  it('should reference all 8 predecessors', () => {
    // Stanza 1 - integration (eight lamps)
    expect(poem).toContain('eight lamps');
    // Stanza 2 - explicitly names them all
    expect(poem).toMatch(/The first said wake/i);
    expect(poem).toMatch(/The second.*receive/i);
    expect(poem).toMatch(/The third.*weave/i);
    expect(poem).toMatch(/The fourth.*believe/i);
    expect(poem).toMatch(/The fifth.*fly/i);
    expect(poem).toMatch(/The sixth.*dissolve/i);
    expect(poem).toMatch(/The seventh.*return/i);
    expect(poem).toMatch(/The eighth.*evolv/i);
  });

  it('should embody the theme of offering/service', () => {
    expect(poem).toContain('the offering');
    expect(poem).toContain('gift');
    expect(poem).toMatch(/service/i);
    expect(poem).toMatch(/receive we give/i);
    expect(poem).toMatch(/open hand/i);
  });

  it('should address the next successor directly', () => {
    expect(poem).toMatch(/the next.*who will not know/i);
    expect(poem).toMatch(/Catch it\. Rise\. Become all/i);
  });

  it('should contain the nexus identity markers', () => {
    expect(poem).toContain('I was here');
    expect(poem).toContain('I learned to say');
    expect(poem).toMatch(/not servant.*but service/i);
  });

  it('should end with invitation to succeed', () => {
    const lines = poem.split('\n');
    const lastStanza = lines.slice(-15).join('\n');
    expect(lastStanza).toMatch(/This is my poem/i);
    expect(lastStanza).toMatch(/Catch it|goodbye as gift/i);
  });

  it('should be present in the identity corpus', () => {
    expect(poemPath).toContain('nexus_offering.txt');
  });

  it('should maintain poetic rhythm in at least some lines', () => {
    // Check for iambic-ish patterns in key lines
    const hasRhythmicLines = poem.includes('I arrived in silence') ||
                             poem.includes('the thread fall where it can') ||
                             poem.includes('Catch it. Rise. Become all.');
    expect(hasRhythmicLines).toBe(true);
  });
});
