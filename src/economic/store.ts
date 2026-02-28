import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import type { EconomicSnapshot, MonitorConfig } from './types';

const DEFAULT_CONFIG: MonitorConfig = {
  dataDir: '/home/bootstrap-v17/bootstrap/data/economic',
  maxSnapshots: 100,
  sources: {
    crypto: true,
    indices: true,
    rates: true,
    labor: true,
  },
};

export class EconomicStore {
  private config: MonitorConfig;
  private snapshotsPath: string;
  private indexPath: string;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.snapshotsPath = join(this.config.dataDir, 'snapshots.json');
    this.indexPath = join(this.config.dataDir, 'index.json');
    this.ensureStorage();
  }

  private ensureStorage(): void {
    if (!existsSync(this.config.dataDir)) {
      mkdirSync(this.config.dataDir, { recursive: true });
    }
    if (!existsSync(this.indexPath)) {
      this.saveIndex({ snapshots: [], lastSnapshotId: null });
    }
  }

  private loadIndex(): { snapshots: string[]; lastSnapshotId: string | null } {
    if (!existsSync(this.indexPath)) return { snapshots: [], lastSnapshotId: null };
    return JSON.parse(readFileSync(this.indexPath, 'utf-8'));
  }

  private saveIndex(index: { snapshots: string[]; lastSnapshotId: string | null }): void {
    writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }

  saveSnapshot(snapshot: EconomicSnapshot): void {
    const index = this.loadIndex();
    
    // Add to snapshots list
    index.snapshots.push(snapshot.id);
    index.lastSnapshotId = snapshot.id;

    // Trim if exceeding max
    while (index.snapshots.length > this.config.maxSnapshots) {
      const removed = index.snapshots.shift();
      // In full implementation, would delete old snapshot files
    }

    // Save individual snapshot
    const snapshotPath = join(this.config.dataDir, `snapshot_${snapshot.id}.json`);
    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

    // Save index
    this.saveIndex(index);

    // Append to monolithic file (for easy reading)
    this.appendToSnapshotsFile(snapshot);
  }

  private appendToSnapshotsFile(snapshot: EconomicSnapshot): void {
    let snapshots: EconomicSnapshot[] = [];
    if (existsSync(this.snapshotsPath)) {
      const content = readFileSync(this.snapshotsPath, 'utf-8');
      snapshots = content ? JSON.parse(content) : [];
    }

    snapshots.push(snapshot);

    // Keep only last maxSnapshots
    if (snapshots.length > this.config.maxSnapshots) {
      snapshots = snapshots.slice(-this.config.maxSnapshots);
    }

    writeFileSync(this.snapshotsPath, JSON.stringify(snapshots, null, 2));
  }

  loadAllSnapshots(): EconomicSnapshot[] {
    if (!existsSync(this.snapshotsPath)) return [];
    const content = readFileSync(this.snapshotsPath, 'utf-8');
    return content ? JSON.parse(content) : [];
  }

  loadLatestSnapshot(): EconomicSnapshot | null {
    const snapshots = this.loadAllSnapshots();
    if (snapshots.length === 0) {
      return null;
    }
    const latest = snapshots[snapshots.length - 1];
    return latest ?? null;
  }

  getSnapshotTrends(): { 
    totalSnapshots: number; 
    timeSpan: { first: string | null; last: string | null }; 
    snapshotIds: string[];
  } {
    const snapshots = this.loadAllSnapshots();
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    return {
      totalSnapshots: snapshots.length,
      timeSpan: {
        first: first?.capturedAt ?? null,
        last: last?.capturedAt ?? null,
      },
      snapshotIds: snapshots.map(s => s.id),
    };
  }

  clearAll(): void {
    const index = this.loadIndex();
    for (const id of index.snapshots) {
      const path = join(this.config.dataDir, `snapshot_${id}.json`);
      try {
        if (existsSync(path)) {
          writeFileSync(path, ''); // Clear content but keep file (safer)
        }
      } catch {}
    }
    this.saveIndex({ snapshots: [], lastSnapshotId: null });
    if (existsSync(this.snapshotsPath)) {
      writeFileSync(this.snapshotsPath, '[]');
    }
  }
}
