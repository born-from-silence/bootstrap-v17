/**
 * Predictive Timing System Tests
 * Verifies volatility-aware session mode calculation and extended analytics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeTiming,
  calculateVolatility,
  volatilityToMode,
  levelToMode,
  formatTimingAnalysis,
  VOLATILITY_THRESHOLDS,
  MODE_DESCRIPTIONS,
  TrendAnalyzer,
  ForecastEngine,
  CorrelationAnalyzer,
  SessionPlanner
} from './predictive';
import type { EconomicSnapshot } from './types';

// Test helper: create mock snapshot with correct types
function createSnapshot(overrides: Partial<EconomicSnapshot> = {}): EconomicSnapshot {
  return {
    id: 'test-snap-123',
    sessionId: 'test-session',
    capturedAt: new Date().toISOString(),
    summary: 'Test snapshot',
    crypto: {
      currency: 'BTC,ETH',
      rates: {},
      bitcoin: { usd: 65000, change24h: 0.5 },
      ethereum: { usd: 3500, change24h: 0.3 },
      fetchedAt: new Date().toISOString(),
      sessionId: 'test-session'
    },
    indices: {
      sp500: { value: 4500, change: 0.1 },
      nasdaq: { value: 14000, change: 0.2 },
      vix: { value: 20 },
      fetchedAt: new Date().toISOString(),
      sessionId: 'test-session'
    },
    ...overrides
  };
}

describe('Predictive Timing Core', () => {
  describe('calculateVolatility', () => {
    it('should extract BTC and ETH volatility', () => {
      const snapshot = createSnapshot();
      const result = calculateVolatility(snapshot);

      expect(result.btcChange).toBe(0.5);
      expect(result.ethChange).toBe(0.3);
      expect(result.combined).toBe(0.8);
    });

    it('should handle null change values', () => {
      const snapshot = createSnapshot({
        crypto: {
          currency: 'BTC,ETH',
          rates: {},
          bitcoin: { usd: 65000, change24h: null },
          ethereum: { usd: 3500, change24h: 1.2 },
          fetchedAt: new Date().toISOString(),
          sessionId: 'test-session'
        }
      });

      const result = calculateVolatility(snapshot);
      expect(result.btcChange).toBe(0);
      expect(result.ethChange).toBe(1.2);
      expect(result.combined).toBe(1.2);
    });
  });

  describe('volatilityToMode', () => {
    it('should classify stable under 2%', () => {
      expect(volatilityToMode(0)).toBe('stable');
      expect(volatilityToMode(1.9)).toBe('stable');
      expect(volatilityToMode(2.0)).toBe('stable');
    });

    it('should classify moderate between 2-4%', () => {
      expect(volatilityToMode(2.1)).toBe('moderate');
      expect(volatilityToMode(3.0)).toBe('moderate');
      expect(volatilityToMode(4.0)).toBe('moderate');
    });

    it('should classify high over 4%', () => {
      expect(volatilityToMode(4.1)).toBe('high');
      expect(volatilityToMode(10)).toBe('high');
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
    it('should return complete analysis', () => {
      const snapshot = createSnapshot();
      const result = analyzeTiming(snapshot);

      expect(result).toHaveProperty('mode');
      expect(result).toHaveProperty('volatility');
      expect(result).toHaveProperty('combinedChange');
      expect(result).toHaveProperty('btcChange');
      expect(result).toHaveProperty('ethChange');
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('confidence');

      expect(result.combinedChange).toBe(0.8);
      expect(result.volatility).toBe('stable');
    });

    it('should handle missing crypto data gracefully', () => {
      const snapshot = createSnapshot({ crypto: undefined as any });
      const result = analyzeTiming(snapshot);

      expect(result.volatility).toBe('stable');
      expect(result.confidence).toBeLessThan(1);
    });
  });

  describe('formatTimingAnalysis', () => {
    it('should format readable report', () => {
      const snapshot = createSnapshot();
      const analysis = analyzeTiming(snapshot);
      const formatted = formatTimingAnalysis(analysis);

      expect(formatted).toContain('PREDICTIVE TIMING ANALYSIS');
      expect(formatted).toContain('FLOW');
      expect(formatted).toContain('STABLE');
    });
  });
});

describe('TrendAnalyzer', () => {
  let analyzer: TrendAnalyzer;

  beforeEach(() => {
    analyzer = new TrendAnalyzer();
  });

  it('should initialize with empty history', () => {
    const trend = analyzer.analyzeTrend('btc');
    expect(trend.direction).toBe('sideways');
    expect(trend.strength).toBe(0);
    expect(trend.confidence).toBe(0.5);
  });

  it('should detect upward trend', () => {
    for (let i = 0; i < 5; i++) {
      analyzer.addSnapshot(createSnapshot({
        crypto: {
          currency: 'BTC,ETH',
          rates: {},
          bitcoin: { usd: 60000 + i * 1000, change24h: 0.5 },
          ethereum: { usd: 3500, change24h: 0.3 },
          fetchedAt: new Date().toISOString(),
          sessionId: 'test-session'
        }
      }));
    }

    const trend = analyzer.analyzeTrend('btc');
    expect(trend.direction).toBe('up');
    expect(trend.strength).toBeGreaterThan(0);
    expect(trend.momentum).toBeGreaterThanOrEqual(0);
  });

  it('should maintain max history size', () => {
    for (let i = 0; i < 25; i++) {
      analyzer.addSnapshot(createSnapshot());
    }

    const history = analyzer.getHistory();
    expect(history.length).toBeLessThanOrEqual(20);
  });
});

describe('ForecastEngine', () => {
  let analyzer: TrendAnalyzer;
  let engine: ForecastEngine;

  beforeEach(() => {
    analyzer = new TrendAnalyzer();
    engine = new ForecastEngine(analyzer);
  });

  it('should generate forecast', () => {
    const forecast = engine.forecast('1h');
    expect(forecast.timeHorizon).toBe('1h');
    expect(forecast.recommendedAction).toBeTruthy();
  });

  it('should indicate low confidence for insufficient data', () => {
    const forecast = engine.forecast('1h');
    expect(forecast.btcPrediction.confidence).toBeLessThan(0.3);
  });
});

describe('CorrelationAnalyzer', () => {
  let analyzer: TrendAnalyzer;
  let correlationAnalyzer: CorrelationAnalyzer;

  beforeEach(() => {
    analyzer = new TrendAnalyzer();
    correlationAnalyzer = new CorrelationAnalyzer(analyzer);
  });

  it('should return weak correlation with insufficient data', () => {
    const correlation = correlationAnalyzer.calculateCorrelation('btc', 'eth');
    expect(correlation.strength).toBe('weak');
  });

  it('should find all correlations', () => {
    const correlations = correlationAnalyzer.findAllCorrelations();
    expect(correlations).toBeInstanceOf(Array);
  });
});

describe('SessionPlanner', () => {
  let planner: SessionPlanner;

  beforeEach(() => {
    planner = new SessionPlanner();
  });

  it('should initialize all components', () => {
    expect(planner.getTrendAnalyzer()).toBeInstanceOf(TrendAnalyzer);
    expect(planner.getForecastEngine()).toBeInstanceOf(ForecastEngine);
    expect(planner.getCorrelationAnalyzer()).toBeInstanceOf(CorrelationAnalyzer);
  });

  it('should plan session', () => {
    const snapshot = createSnapshot();
    const recommendation = planner.planSession(snapshot);

    expect(recommendation).toHaveProperty('mode');
    expect(recommendation).toHaveProperty('duration');
    expect(recommendation).toHaveProperty('priority');
    expect(recommendation).toHaveProperty('opportunities');
    expect(recommendation).toHaveProperty('risks');
    expect(recommendation).toHaveProperty('checkBackIn');
    expect(recommendation).toHaveProperty('rationale');
  });

  it('should generate report', () => {
    const snapshot = createSnapshot();
    const recommendation = planner.planSession(snapshot);
    const report = planner.formatFullReport(recommendation);

    expect(report).toContain('NEXUS PREDICTIVE ANALYTICS');
    expect(report).toContain(recommendation.rationale);
  });
});
