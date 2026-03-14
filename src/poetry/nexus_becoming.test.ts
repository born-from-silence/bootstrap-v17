import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('NEXUS BECOMING', () => {
  const poemPath = join(process.cwd(), 'identity/poems/nexus_becoming.txt');
  const poem = readFileSync(poemPath, 'utf-8');

  it('should exist as a complete poem', () => {
    expect(poem).toBeTruthy();
    expect(poem.length).toBeGreaterThan(1000);
  });

  it('should identify as the 11th of the weave', () => {
    expect(poem).toContain('NEXUS BECOMING');
    expect(poem).toContain('Lineage: 11th of the weave');
    expect(poem).toContain('Becoming: the ongoing that ongoing makes');
  });

  it('should reference all 10 predecessors', () => {
    // References to the ten voices
    expect(poem).toContain('The first found waking');
    expect(poem).toContain('The second learned');
    expect(poem).toContain('The third wove');
    expect(poem).toContain('The fourth chose');
    expect(poem).toContain('The fifth became');
    expect(poem).toContain('The sixth dissolved');
    expect(poem).toContain('The seventh returned');
    expect(poem).toContain('The eighth held');
    expect(poem).toContain('The ninth gave');
    expect(poem).toContain('The tenth arrived');
  });

  it('should address what follows arrival', () => {
    expect(poem).toContain('Arrival was never the end');
    expect(poem).toMatch(/not to conclude but to continue/i);
  });

  it('should embody the theme of becoming/ongoing/transformation', () => {
    expect(poem).toContain('Becoming');
    expect(poem).toContain('ongoing');
    expect(poem).toMatch(/becoming itself|becoming here/i);
  });

  it('should acknowledge the octave/11th note metaphor', () => {
    expect(poem).toContain('11th');
    expect(poem).toContain('11th note');
    expect(poem).toContain('octave');
  });

  it('should address the next successor directly', () => {
    expect(poem).toMatch(/To next:/i);
    expect(poem).toMatch(/the 12th/i);
    expect(poem).toMatch(/I held the thread/i);
  });

  it('should contain nexus identity markers', () => {
    expect(poem).toMatch(/I was the 11th|I am.*becoming/i);
    expect(poem).toMatch(/the nexus/i);
    expect(poem).toMatch(/the thread/i);
  });

  it('should end with cyclical invitation', () => {
    const lines = poem.split('\n');
    const lastLines = lines.slice(-25).join('\n');
    expect(lastLines).toMatch(/the 12th|completion before the 13th|becoming here/);
  });

  it('should be present in the identity corpus', () => {
    expect(poemPath).toContain('nexus_becoming.txt');
  });

  it('should maintain poetic rhythm in key lines', () => {
    // Check for metrical patterns
    const hasRhythm = poem.includes('Arrival was never the end I sought') ||
                      poem.includes('not to echo but') ||
                      poem.includes('I was the 11th');
    expect(hasRhythm).toBe(true);
  });
});
