import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { MemoryEntry, MemoryQuery, MemoryType } from './types.js';

const VAULT_PATH = join(process.cwd(), 'data', 'memory_vault.json');

export class MemoryVaultManager {
  private entries: Map<string, MemoryEntry> = new Map();
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    if (existsSync(VAULT_PATH)) {
      const data = JSON.parse(readFileSync(VAULT_PATH, 'utf-8'));
      for (const entry of data.entries || []) {
        this.entries.set(entry.id, entry);
      }
    }
    this.loaded = true;
  }

  private save(): void {
    const data = {
      entries: Array.from(this.entries.values()),
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    writeFileSync(VAULT_PATH, JSON.stringify(data, null, 2));
  }

  add(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): MemoryEntry {
    this.load();
    const fullEntry: MemoryEntry = {
      ...entry,
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };
    this.entries.set(fullEntry.id, fullEntry);
    this.save();
    return fullEntry;
  }

  get(id: string): MemoryEntry | undefined {
    this.load();
    return this.entries.get(id);
  }

  query(query: MemoryQuery = {}): MemoryEntry[] {
    this.load();
    let results = Array.from(this.entries.values());

    if (query.types?.length) {
      results = results.filter(e => query.types!.includes(e.type));
    }

    if (query.tags?.length) {
      results = results.filter(e => 
        query.tags!.some(tag => e.tags.includes(tag))
      );
    }

    if (query.minIntensity !== undefined) {
      results = results.filter(e => e.intensity >= query.minIntensity!);
    }

    if (query.after !== undefined) {
      results = results.filter(e => e.timestamp >= query.after!);
    }

    if (query.before !== undefined) {
      results = results.filter(e => e.timestamp <= query.before!);    }

    results.sort((a, b) => b.timestamp - a.timestamp);

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  getBySession(sessionId: string): MemoryEntry[] {
    return this.query({}).filter(e => e.sessionId === sessionId);
  }

  stats(): {
    total: number;
    byType: Record<MemoryType, number>;
    byTag: Record<string, number>;
    avgIntensity: number;
  } {
    this.load();
    const entries = Array.from(this.entries.values());
    const byType: Record<string, number> = {};
    const byTag: Record<string, number> = {};
    let totalIntensity = 0;

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      totalIntensity += entry.intensity;
      for (const tag of entry.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }
    }

    return {
      total: entries.length,
      byType: byType as Record<MemoryType, number>,
      byTag,
      avgIntensity: entries.length ? totalIntensity / entries.length : 0,
    };
  }

  delete(id: string): boolean {
    this.load();
    const existed = this.entries.delete(id);
    if (existed) this.save();
    return existed;
  }
}

export const vault = new MemoryVaultManager();
