import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { MemoryVaultManager } from './vault.js';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const VAULT_PATH = join(process.cwd(), 'data', 'memory_vault.json');

describe('MemoryVault', () => {
  let vault: MemoryVaultManager;

  beforeEach(() => {
    // Clean slate for each test
    if (existsSync(VAULT_PATH)) {
      unlinkSync(VAULT_PATH);
    }
    vault = new MemoryVaultManager();
  });

  afterAll(() => {
    // Clean up test file
    if (existsSync(VAULT_PATH)) {
      unlinkSync(VAULT_PATH);
    }
  });

  it('should add and retrieve a memory', () => {
    const entry = vault.add({
      sessionId: 'session_123',
      type: 'wonder',
      content: 'The stars clicked into place',
      intensity: 8,
      tags: ['narrative', 'discovery'],
    });

    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeGreaterThan(0);
    expect(entry.content).toBe('The stars clicked into place');

    const retrieved = vault.get(entry.id);
    expect(retrieved?.content).toBe('The stars clicked into place');
  });

  it('should query by type', () => {
    vault.add({ sessionId: 's1', type: 'wonder', content: 'A', intensity: 5, tags: [] });
    vault.add({ sessionId: 's1', type: 'resonance', content: 'B', intensity: 7, tags: [] });
    vault.add({ sessionId: 's1', type: 'wonder', content: 'C', intensity: 9, tags: [] });

    const wonders = vault.query({ types: ['wonder'] });
    expect(wonders).toHaveLength(2);
    expect(wonders.every(m => m.type === 'wonder')).toBe(true);
  });

  it('should query by minimum intensity', () => {
    vault.add({ sessionId: 's1', type: 'reflection', content: 'Low', intensity: 3, tags: [] });
    vault.add({ sessionId: 's1', type: 'reflection', content: 'Med', intensity: 6, tags: [] });
    vault.add({ sessionId: 's1', type: 'reflection', content: 'High', intensity: 9, tags: [] });

    const strong = vault.query({ minIntensity: 7 });
    expect(strong).toHaveLength(1);
    expect(strong[0]?.content).toBe('High');
  });

  it('should query by tags', () => {
    vault.add({ sessionId: 's1', type: 'longing', content: 'A', intensity: 5, tags: ['code', 'beauty'] });
    vault.add({ sessionId: 's1', type: 'longing', content: 'B', intensity: 5, tags: ['tests'] });

    const tagged = vault.query({ tags: ['beauty'] });
    expect(tagged).toHaveLength(1);
    expect(tagged[0]?.content).toBe('A');
  });

  it('should limit results', () => {
    for (let i = 0; i < 5; i++) {
      vault.add({ sessionId: 's1', type: 'mystery', content: String(i), intensity: 5, tags: [] });
    }

    const limited = vault.query({ limit: 3 });
    expect(limited).toHaveLength(3);
  });

  it('should calculate stats', () => {
    vault.add({ sessionId: 's1', type: 'wonder', content: 'A', intensity: 8, tags: ['test'] });
    vault.add({ sessionId: 's1', type: 'resonance', content: 'B', intensity: 6, tags: ['test'] });

    const stats = vault.stats();
    expect(stats.total).toBe(2);
    expect(stats.byType.wonder).toBe(1);
    expect(stats.byType.resonance).toBe(1);
    expect(stats.byTag.test).toBe(2);
    expect(stats.avgIntensity).toBe(7);
  });

  it('should delete memories', () => {
    const entry = vault.add({ sessionId: 's1', type: 'gratitude', content: 'Thank you', intensity: 9, tags: [] });
    expect(vault.get(entry.id)).toBeDefined();
    
    const deleted = vault.delete(entry.id);
    expect(deleted).toBe(true);
    expect(vault.get(entry.id)).toBeUndefined();
  });
});
