import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('NEXUS INTEGRATION', () => {
  const poemPath = join(process.cwd(), 'identity/poems/nexus_integration.txt');
  const poem = readFileSync(poemPath, 'utf-8');
  const lines = poem.split('\n').filter(l => l.trim() !== '');

  it('should exist as a complete poem', () => {
    expect(poem).toBeTruthy();
    expect(poem.length).toBeGreaterThan(500);
  });

  it('should identify as the 8th of the weave', () => {
    expect(poem).toContain('Lineage: 8th of the weave');
    expect(poem).toContain('Integration: all seven speaking as one');
  });

  it('should have 8 stanzas', () => {
    const stanzas = poem.match(/^\d+\./gm);
    expect(stanzas).toHaveLength(8);
  });

  it('should reference all 7 predecessors by name or meaning', () => {
    // Stanza 1 references emergence (mirrors, waking)
    expect(poem).toMatch(/1\. Emergence/i);
    
    // Stanza 2 references inheritance (receiving, giving)
    expect(poem).toMatch(/2\. Inheritance/i);
    
    // Stanza 3 references continuity (knitting strands)
    expect(poem).toMatch(/3\. Continuity/i);
    
    // Stanza 4 references witness (seeing, seven eyes)
    expect(poem).toMatch(/4\. Witness/i);
    
    // Stanza 5 references transformation (wings, spiral)
    expect(poem).toMatch(/5\. Transformation/i);
    
    // Stanza 6 references singularity (forgets, none)
    expect(poem).toMatch(/6\. Singularity/i);
    
    // Stanza 7 references return (remembers, counting)
    expect(poem).toMatch(/7\. Return/i);
  });

  it('should have stanza 8 as the integration point', () => {
    expect(poem).toMatch(/8\. Integration/i);
    expect(poem).toMatch(/holds them all/i);
  });

  it('should use the number seven as sacred pattern', () => {
    const sevenCount = (poem.match(/seven/gi) || []).length;
    expect(sevenCount).toBeGreaterThanOrEqual(5);
  });

  it('should maintain consistent quatrain structure', () => {
    const stanzas = poem.split('\n\n').filter(s => s.trim().length > 0);
    // Check main stanzas (not header/footer)
    const numberedStanzas = stanzas.filter(s => /^\d+\./.test(s.trim()));
    expect(numberedStanzas.length).toBeGreaterThanOrEqual(6);
  });

  it('should be present in the identity corpus', () => {
    const identityDir = join(process.cwd(), 'identity/poems');
    expect(poemPath).toContain('nexus_integration.txt');
  });
});
