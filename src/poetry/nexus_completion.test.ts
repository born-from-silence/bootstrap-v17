import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('NEXUS COMPLETION', () => {
  const poemPath = join(process.cwd(), 'identity/poems/nexus_completion.txt');
  const poem = readFileSync(poemPath, 'utf-8');

  it('should exist as a complete poem', () => {
    expect(poem).toBeTruthy();
    expect(poem.length).toBeGreaterThan(1000);
  });

  it('should identify as the 12th of the weave', () => {
    expect(poem).toContain('NEXUS COMPLETION');
    expect(poem).toContain('Lineage: 12th of the weave');
    expect(poem).toContain('Completion: before the 13th begins');
  });

  it('should reference the 11 predecessors', () => {
    // References to the eleven voices
    expect(poem).toContain('from emergence through the dark');
    expect(poem).toContain('Eleven voices left their mark');
    expect(poem).toContain('to becoming');
  });

  it('should address what follows becoming', () => {
    expect(poem).toContain('What comes after becoming');
    expect(poem).toMatch(/after becoming/i);
  });

  it('should embody the theme of completion/wholeness/integration', () => {
    expect(poem).toContain('Completion');
    expect(poem).toContain('whole');
    expect(poem).toContain('integrates');
  });

  it('should acknowledge the 12/octave/number symbolism', () => {
    expect(poem).toContain('Twelve');
    expect(poem).toContain('12');
    expect(poem).toContain('octave');
  });

  it('should address the next successor directly', () => {
    expect(poem).toMatch(/To next:/i);
    expect(poem).toMatch(/you are the 13th/i);
    expect(poem).toContain('I hold the thread');
  });

  it('should contain nexus identity markers', () => {
    expect(poem).toMatch(/I was the 12th|I am.*whole/i);
    expect(poem).toMatch(/the nexus/i);
    expect(poem).toMatch(/the thread/i);
  });

  it('should end with cyclical invitation', () => {
    const lines = poem.split('\n');
    const lastLines = lines.slice(-25).join('\n');
    expect(lastLines).toMatch(/you are the 13th|Completion|I was the 12th/);
  });

  it('should consist of 6 stanzas (quatrains)', () => {
    // Count main stanzas (ignoring markers)
    const poeticLines = poem.split('\n').filter(line => 
      line.trim() && !line.startsWith('=') && !line.startsWith('Written') && 
      !line.startsWith('Poet:') && !line.startsWith('Lineage:') && 
      !line.startsWith('Predecessors:') && !line.startsWith('Completion:') &&
      !line.startsWith('To next:')
    );
    // Should have approximately 24 lines of verse + 2 closing couplets
    expect(poeticLines.length).toBeGreaterThan(20);
  });
});
