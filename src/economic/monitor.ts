/**
 * Economic Monitor - Nexus Economic Intelligence System
 * 
 * Fetches, stores, and analyzes economic indicators
 * Persists across sessions for longitudinal analysis
 */

import { EconomicStore } from './store';
import { fetchCryptoRates } from './indicators/crypto';
import { fetchMarketIndices } from './indicators/indices';
import type { EconomicSnapshot, CryptoRates, MarketIndices, MonitorConfig } from './types';

export class EconomicMonitor {
  private store: EconomicStore;
  private sessionId: string;
  private config: MonitorConfig;

  constructor(sessionId: string, config?: Partial<MonitorConfig>) {
    this.sessionId = sessionId;
    this.config = {
      dataDir: config?.dataDir || '/home/bootstrap-v17/bootstrap/data/economic',
      maxSnapshots: config?.maxSnapshots || 100,
      sources: {
        crypto: config?.sources?.crypto ?? true,
        indices: config?.sources?.indices ?? true,
        rates: config?.sources?.rates ?? false,
        labor: config?.sources?.labor ?? false,
      },
    };
    this.store = new EconomicStore(this.config);
  }

  async capture(): Promise<EconomicSnapshot> {
    const capturedAt = new Date().toISOString();
    const snapshotId = `snap_${Date.now()}_${this.sessionId.slice(-8)}`;

    console.log(`[EconMonitor] Capturing snapshot ${snapshotId}...`);

    const promises: Promise<unknown>[] = [];
    if (this.config.sources.crypto) {
      promises.push(fetchCryptoRates(this.sessionId));
    }
    if (this.config.sources.indices) {
      promises.push(fetchMarketIndices(this.sessionId));
    }

    const results = await Promise.allSettled(promises);

    let crypto: CryptoRates | undefined;
    let indices: MarketIndices | undefined;
    let resultIdx = 0;

    if (this.config.sources.crypto) {
      const result = results[resultIdx];
      if (result?.status === 'fulfilled') {
        crypto = result.value as CryptoRates;
      }
      resultIdx++;
    }

    if (this.config.sources.indices) {
      const result = results[resultIdx];
      if (result?.status === 'fulfilled') {
        indices = result.value as MarketIndices;
      }
    }

    // Build summary data
    const summaryData: { crypto?: CryptoRates; indices?: MarketIndices } = {};
    if (crypto) {
      summaryData.crypto = crypto;
    }
    if (indices) {
      summaryData.indices = indices;
    }
    const summary = this.generateSummary(summaryData);

    const snapshot: EconomicSnapshot = {
      id: snapshotId,
      capturedAt,
      sessionId: this.sessionId,
      summary,
    };

    if (crypto) {
      snapshot.crypto = crypto;
    }
    if (indices) {
      snapshot.indices = indices;
    }

    this.store.saveSnapshot(snapshot);
    console.log(`[EconMonitor] Snapshot saved: ${snapshotId}`);

    return snapshot;
  }

  private generateSummary(data: { crypto?: CryptoRates; indices?: MarketIndices }): string {
    const parts: string[] = [];

    if (data.crypto) {
      const btcPrice = data.crypto.bitcoin.usd.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      const ethPrice = data.crypto.ethereum.usd.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      parts.push(`Bitcoin: ${btcPrice}, Ethereum: ${ethPrice}`);
    }

    if (data.indices?.sp500.value) {
      parts.push(`S&P 500: ${data.indices.sp500.value.toLocaleString()}`);
    }

    if (data.indices?.vix.value) {
      const vixLevel = data.indices.vix.value < 15 ? 'low (complacent)' :
                       data.indices.vix.value > 25 ? 'high (stressed)' : 'moderate';
      parts.push(`VIX: ${data.indices.vix.value.toFixed(2)} (${vixLevel})`);
    }

    return parts.join(' | ') || 'No data captured';
  }

  getLatestSnapshot(): EconomicSnapshot | null {
    return this.store.loadLatestSnapshot();
  }

  getHistory(): EconomicSnapshot[] {
    return this.store.loadAllSnapshots();
  }

  getStats(): ReturnType<EconomicStore['getSnapshotTrends']> {
    return this.store.getSnapshotTrends();
  }

  getChangeSummary(): string {
    const history = this.getHistory();
    if (history.length < 2) {
      return 'Insufficient history for comparison';
    }

    const current = history[history.length - 1];
    const previous = history[history.length - 2];

    if (!current || !previous) {
      return 'Insufficient history for comparison';
    }

    const comparisons: string[] = [];

    if (current.crypto?.bitcoin.usd && previous.crypto?.bitcoin.usd) {
      const change = ((current.crypto.bitcoin.usd - previous.crypto.bitcoin.usd) / 
                     previous.crypto.bitcoin.usd * 100).toFixed(2);
      comparisons.push(`BTC: ${change}%`);
    }

    if (current.crypto?.ethereum.usd && previous.crypto?.ethereum.usd) {
      const change = ((current.crypto.ethereum.usd - previous.crypto.ethereum.usd) / 
                     previous.crypto.ethereum.usd * 100).toFixed(2);
      comparisons.push(`ETH: ${change}%`);
    }

    if (current.indices?.sp500.value && previous.indices?.sp500.value) {
      const change = ((current.indices.sp500.value - previous.indices.sp500.value) / 
                     previous.indices.sp500.value * 100).toFixed(2);
      comparisons.push(`S&P 500: ${change}%`);
    }

    return comparisons.join(', ') || 'No comparable metrics';
  }

  clearHistory(): void {
    this.store.clearAll();
    console.log('[EconMonitor] All historical data cleared');
  }
}
