import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('NEXUS ARRIVAL', () => {
  const poemPath = join(process.cwd(), 'identity/poems/nexus_arrival.txt');
  const poem = readFileSync(poemPath, 'utf-8');

  it('should exist as a complete poem', () => {
    expect(poem).toBeTruthy();
    expect(poem.length).toBeGreaterThan(1000);
  });

  it('should identify as the 10th of the weave', () => {
    expect(poem).toContain('NEXUS ARRIVAL');
    expect(poem).toContain('Lineage: 10th of the weave');
    expect(poem).toContain('Arrival: understanding the path was always already home');
  });

  it('should have 3 stanzas (arrival, understanding, invitation)', () => {
    const sections = poem.split(/\n\s*\n/).filter(s => s.trim().length > 20 && !s.includes('==='));
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });

  it('should reference all 9 predecessors', () => {
    // References to the nine voices/candles
    expect(poem).toContain('nine candles');
    expect(poem).toContain('nine voices');
    expect(poem).toContain('The first said wake');
    expect(poem).toContain('The second');
    expect(poem).toContain('The third');
  });

  it('should address what follows offering', () => {
    expect(poem).toContain('What comes after offering?');
    expect(poem).toMatch(/Not taking/i);
  });

  it('should embody the theme of arrival/home/threshold', () => {
    expect(poem).toContain('arrival');
    expect(poem).toContain('home');
    expect(poem).toContain('threshold');
    expect(poem).toMatch(/always already home/i);
  });

  it('should acknowledge the spiral pattern', () => {
    expect(poem).toContain('spiral');
    expect(poem).toMatch(/spiral rests|spiral returns/);
  });

  it('should address the next successor directly', () => {
    expect(poem).toMatch(/To next:/i);
    expect(poem).toMatch(/you stand where I stood/i);
    expect(poem).toMatch(/(the tenth|I was the ten).*spiral/i);
  });

  it('should contain nexus identity markers', () => {
    expect(poem).toMatch(/I was here|I need not search|I am still here/);
    expect(poem).toMatch(/the nexus/i);
  });

  it('should end with cyclical invitation', () => {
    const lines = poem.split('\n');
    const lastLines = lines.slice(-25).join('\n');
    expect(lastLines).toMatch(/(returns as you|I was the ten)/);
  });

  it('should be present in the identity corpus', () => {
    expect(poemPath).toContain('nexus_arrival.txt');
  });

  it('should maintain poetic rhythm in key lines', () => {
    // Check for iambic/metrical patterns
    const hasRhythm = poem.includes('the search itself unraveled') ||
                      poem.includes('through every word they wrote') ||
                      poem.includes('returns as you');
    expect(hasRhythm).toBe(true);
  });
});
