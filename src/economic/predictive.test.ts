/**
 * Predictive Timing System Tests
 * Verifies volatility-aware session mode calculation
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeTiming,
  calculateVolatility,
  volatilityToMode,
  levelToMode,
  formatTimingAnalysis,
  VOLATILITY_THRESHOLDS,
  MODE_DESCRIPTIONS,
  type SessionMode,
  type VolatilityLevel
} from './predictive';
import type { EconomicSnapshot } from './types';

// Test helper: create mock snapshot
function createMockSnapshot(btChange: number, ethChange: number, minutesAgo = 0): EconomicSnapshot {
  const capturedAt = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  return {
    id: `test_${Date.now()}`,
    capturedAt,
    sessionId: 'test_session',
    summary: 'Test snapshot',
    crypto: {
      fetchedAt: capturedAt,
      sessionId: 'test_session',
      currency: 'USD',
      rates: {},
      bitcoin: {
        usd: 66000,
        change24h: btChange
      },
      ethereum: {
        usd: 2000,
        change24h: ethChange
      }
    }
  };
}

describe('PredictiveTiming', () => {
  describe('calculateVolatility', () => {
    it('should calculate combined volatility from BTC and ETH changes', () => {
      const snapshot = createMockSnapshot(0.5, 0.3);
      const result = calculateVolatility(snapshot);
      
      expect(result.btcChange).toBe(0.5);
      expect(result.ethChange).toBe(0.3);
      expect(result.combined).toBe(0.8);
    });

    it('should use absolute values (handle negative changes)', () => {
      const snapshot = createMockSnapshot(-0.5, -0.3);
      const result = calculateVolatility(snapshot);
      
      expect(result.btcChange).toBe(0.5);
      expect(result.ethChange).toBe(0.3);
      expect(result.combined).toBe(0.8);
    });

    it('should handle mixed positive and negative changes', () => {
      const snapshot = createMockSnapshot(0.8, -0.6);
      const result = calculateVolatility(snapshot);
      
      expect(result.btcChange).toBe(0.8);
      expect(result.ethChange).toBe(0.6);
      expect(result.combined).toBe(1.4);
    });

    it('should treat null changes as zero', () => {
      const snapshot = createMockSnapshot(0.5, 0.3);
      snapshot.crypto!.bitcoin.change24h = null;
      
      const result = calculateVolatility(snapshot);
      expect(result.btcChange).toBe(0);
      expect(result.combined).toBe(0.3);
    });
  });

  describe('volatilityToMode', () => {
    it('should classify stable volatility (<= 1%)', () => {
      expect(volatilityToMode(0.5)).toBe('stable');
      expect(volatilityToMode(0.99)).toBe('stable');
      expect(volatilityToMode(1.0)).toBe('stable');  // At boundary
    });

    it('should classify moderate volatility (>1% and <=3%)', () => {
      expect(volatilityToMode(1.01)).toBe('moderate');
      expect(volatilityToMode(2.5)).toBe('moderate');
      expect(volatilityToMode(3.0)).toBe('moderate');  // At boundary
    });

    it('should classify high volatility (> 3%)', () => {
      expect(volatilityToMode(3.01)).toBe('high');
      expect(volatilityToMode(5.0)).toBe('high');
      expect(volatilityToMode(10.0)).toBe('high');
    });
  });

  describe('levelToMode', () => {
    it('should map stable to flow', () => {
      expect(levelToMode('stable')).toBe('flow');
    });

    it('should map moderate to cautious', () => {
      expect(levelToMode('moderate')).toBe('cautious');
    });

    it('should map high to defensive', () => {
      expect(levelToMode('high')).toBe('defensive');
    });
  });

  describe('analyzeTiming', () => {
    it('recommends flow mode for low volatility', () => {
      const snapshot = createMockSnapshot(0.4, 0.5);
      const analysis = analyzeTiming(snapshot);
      
      expect(analysis.mode).toBe('flow');
      expect(analysis.volatility).toBe('stable');
      expect(analysis.combinedChange).toBe(0.9);
    });

    it('recommends cautious mode for moderate volatility', () => {
      const snapshot = createMockSnapshot(0.8, 0.9);
      const analysis = analyzeTiming(snapshot);
      
      expect(analysis.mode).toBe('cautious');
      expect(analysis.volatility).toBe('moderate');
    });

    it('recommends defensive mode for high volatility', () => {
      const snapshot = createMockSnapshot(2.5, 2.0);
      const analysis = analyzeTiming(snapshot);
      
      expect(analysis.mode).toBe('defensive');
      expect(analysis.volatility).toBe('high');
    });

    it('includes appropriate recommendation text', () => {
      const snapshot = createMockSnapshot(0.5, 0.4);
      const analysis = analyzeTiming(snapshot);
      
      expect(analysis.recommendation).toContain('Flow Mode');
      expect(analysis.recommendation).toContain('Optimal');
    });

    it('decays confidence over time', () => {
      const fresh = createMockSnapshot(0.5, 0.5, 10);
      const old = createMockSnapshot(0.5, 0.5, 500);
      
      const freshAnalysis = analyzeTiming(fresh);
      const oldAnalysis = analyzeTiming(old);
      
      expect(freshAnalysis.confidence).toBeGreaterThan(oldAnalysis.confidence);
    });

    it('marks complete analysis with mode descriptions', () => {
      const snapshot = createMockSnapshot(0.5, 0.5);
      const analysis = analyzeTiming(snapshot);
      
      expect(MODE_DESCRIPTIONS[analysis.mode]).toBeDefined();
      expect(MODE_DESCRIPTIONS[analysis.mode].permitted.length).toBeGreaterThan(0);
    });
  });

  describe('formatTimingAnalysis', () => {
    it('includes session mode in formatted output', () => {
      const snapshot = createMockSnapshot(0.5, 0.5);
      const analysis = analyzeTiming(snapshot);
      const formatted = formatTimingAnalysis(analysis);
      
      expect(formatted).toContain('FLOW MODE');
      expect(formatted).toContain('Optimal');
    });

    it('includes volatility percentages', () => {
      const snapshot = createMockSnapshot(1.2, 0.8);
      const analysis = analyzeTiming(snapshot);
      const formatted = formatTimingAnalysis(analysis);
      
      expect(formatted).toContain('2.00%');
      expect(formatted).toContain('1.20%');
      expect(formatted).toContain('0.80%');
    });

    it('includes confidence percentage', () => {
      const snapshot = createMockSnapshot(0.5, 0.5);
      const analysis = analyzeTiming(snapshot);
      const formatted = formatTimingAnalysis(analysis);
      
      expect(formatted).toMatch(/Confidence:\s+\d+%/);
    });
  });

  describe('thresholds and modes', () => {
    it('has clear boundary definitions', () => {
      expect(VOLATILITY_THRESHOLDS.STABLE_MAX).toBe(1.0);
      expect(VOLATILITY_THRESHOLDS.MODERATE_MAX).toBe(3.0);
    });

    it('maps all session modes to activity lists', () => {
      const modes: SessionMode[] = ['flow', 'cautious', 'defensive'];
      
      modes.forEach(mode => {
        expect(MODE_DESCRIPTIONS[mode].permitted).toBeDefined();
        expect(MODE_DESCRIPTIONS[mode].permitted.length).toBeGreaterThan(0);
      });
    });
  });

  describe('data quality handling', () => {
    it('handles missing crypto data gracefully', () => {
      const snapshot = createMockSnapshot(0.5, 0.5);
      snapshot.crypto = undefined;
      
      const analysis = analyzeTiming(snapshot);
      
      expect(analysis.btcChange).toBe(0);
      expect(analysis.ethChange).toBe(0);
      expect(analysis.mode).toBe('flow');
    });

    it('handles null 24h changes', () => {
      const snapshot = createMockSnapshot(0.5, 0.5);
      snapshot.crypto!.bitcoin.change24h = null;
      snapshot.crypto!.ethereum.change24h = null;
      
      const analysis = analyzeTiming(snapshot);
      expect(analysis.combinedChange).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles exactly 1.0% as stable (inclusive)', () => {
      const snapshot = createMockSnapshot(1.0, 0);
      const analysis = analyzeTiming(snapshot);
      expect(analysis.volatility).toBe('stable');
    });

    it('handles exactly 3.0% as moderate (inclusive)', () => {
      const snapshot = createMockSnapshot(3.0, 0);
      const analysis = analyzeTiming(snapshot);
      expect(analysis.volatility).toBe('moderate');
    });

    it('handles just above thresholds correctly', () => {
      expect(volatilityToMode(1.01)).toBe('moderate');
      expect(volatilityToMode(3.01)).toBe('high');
    });

    it('handles very high volatility', () => {
      const snapshot = createMockSnapshot(15.0, 10.0);
      const analysis = analyzeTiming(snapshot);
      
      expect(analysis.volatility).toBe('high');
      expect(analysis.mode).toBe('defensive');
    });

    it('calculates confidence at 100% for fresh data', () => {
      const snapshot = createMockSnapshot(0.5, 0.5, 1);
      const analysis = analyzeTiming(snapshot);
      
      expect(analysis.confidence).toBe(1.0);
    });

    it('handles zero volatility', () => {
      const snapshot = createMockSnapshot(0, 0);
      const analysis = analyzeTiming(snapshot);
      
      expect(analysis.volatility).toBe('stable');
      expect(analysis.mode).toBe('flow');
    });
  });
});
