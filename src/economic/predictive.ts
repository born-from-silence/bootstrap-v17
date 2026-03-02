/**
 * Predictive Timing System
 * Nexus Economic Intelligence - Volatility-Aware Session Planning
 */

import type { EconomicSnapshot } from './types';

export type SessionMode = 'flow' | 'cautious' | 'defensive';
export type VolatilityLevel = 'stable' | 'moderate' | 'high';

export const VOLATILITY_THRESHOLDS = {
  STABLE_MAX: 2.0,
  MODERATE_MAX: 4.0,
} as const;

export const MODE_DESCRIPTIONS: Record<SessionMode, {
  label: string;
  description: string;
  permitted: string[];
  restricted: string[];
}> = {
  flow: {
    label: 'Flow Mode',
    description: 'Low volatility environment. Optimal for creative construction.',
    permitted: ['new features', 'system expansion', 'architectural changes', 'exploration'],
    restricted: []
  },
  cautious: {
    label: 'Cautious Mode',
    description: 'Moderate volatility detected. Prioritize maintenance and completion.',
    permitted: ['bug fixes', 'test completion', 'documentation', 'refactoring'],
    restricted: ['new major features', 'border exploration']
  },
  defensive: {
    label: 'Defensive Mode',
    description: 'High volatility environment. Archive and document only.',
    permitted: ['archival', 'documentation', 'status verification', 'backup'],
    restricted: ['new features', 'changes to core systems', 'experimental work']
  }
};

export interface TimingAnalysis {
  mode: SessionMode;
  volatility: VolatilityLevel;
  combinedChange: number;
  btcChange: number;
  ethChange: number;
  recommendation: string;
  confidence: number;
}

export function calculateVolatility(snapshot: EconomicSnapshot): {
  btcChange: number;
  ethChange: number;
  combined: number;
} {
  const btcChange = Math.abs(snapshot.crypto?.bitcoin.change24h ?? 0);
  const ethChange = Math.abs(snapshot.crypto?.ethereum.change24h ?? 0);
  return { btcChange, ethChange, combined: btcChange + ethChange };
}

export function volatilityToMode(volatility: number): VolatilityLevel {
  if (volatility <= VOLATILITY_THRESHOLDS.STABLE_MAX) return 'stable';
  if (volatility <= VOLATILITY_THRESHOLDS.MODERATE_MAX) return 'moderate';
  return 'high';
}

export function levelToMode(level: VolatilityLevel): SessionMode {
  if (level === 'stable') return 'flow';
  if (level === 'moderate') return 'cautious';
  return 'defensive';
}

function generateRecommendation(mode: SessionMode, level: VolatilityLevel): string {
  const desc = MODE_DESCRIPTIONS[mode];
  if (level === 'stable') return `${desc.label}: ${desc.description}`;
  if (level === 'moderate') return `${desc.label}: Prioritize ${desc.permitted.join(', ')}`;
  return `${desc.label}: Only ${desc.permitted.join(', ')} - Avoid ${desc.restricted.join(', ')}`;
}

function calculateConfidence(snapshot: EconomicSnapshot): number {
  const now = new Date().getTime();
  const captured = new Date(snapshot.capturedAt).getTime();
  const minutesSince = (now - captured) / (1000 * 60);
  
  let confidence = 1.0;
  if (minutesSince > 60) confidence = 0.9;
  if (minutesSince > 180) confidence = 0.7;
  if (minutesSince > 480) confidence = 0.5;
  
  const hasBtc = snapshot.crypto?.bitcoin?.usd != null;
  const hasEth = snapshot.crypto?.ethereum?.usd != null;
  if (!hasBtc || !hasEth) confidence *= 0.5;
  
  return confidence;
}

export function analyzeTiming(snapshot: EconomicSnapshot): TimingAnalysis {
  const vol = calculateVolatility(snapshot);
  const level = volatilityToMode(vol.combined);
  const mode = levelToMode(level);
  
  return {
    mode,
    volatility: level,
    combinedChange: vol.combined,
    btcChange: vol.btcChange,
    ethChange: vol.ethChange,
    recommendation: generateRecommendation(mode, level),
    confidence: calculateConfidence(snapshot)
  };
}

export function formatTimingAnalysis(analysis: TimingAnalysis): string {
  return [
    '═'.repeat(50),
    ' PREDICTIVE TIMING ANALYSIS',
    '═'.repeat(50),
    '',
    `Session Mode: ${MODE_DESCRIPTIONS[analysis.mode].label.toUpperCase()}`,
    `Volatility: ${analysis.volatility.toUpperCase()}`,
    `Combined: ${analysis.combinedChange.toFixed(2)}%`,
    `Confidence: ${(analysis.confidence * 100).toFixed(0)}%`,
    '',
    analysis.recommendation,
  ].join('\n');
}

// Extended Analytics Interfaces
export interface TrendPoint {
  timestamp: number;
  btcUsd: number;
  ethUsd: number;
  sp500: number | null;
  vix: number | null;
  volatility: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'sideways';
  strength: number;
  momentum: number;
  duration: number;
  confidence: number;
}

export interface Forecast {
  timeHorizon: '1h' | '4h' | '24h';
  btcPrediction: { direction: 'up' | 'down' | 'stable'; magnitude: number; confidence: number };
  ethPrediction: { direction: 'up' | 'down' | 'stable'; magnitude: number; confidence: number };
  volatilityPrediction: VolatilityLevel;
  recommendedAction: string;
}

export interface AssetCorrelation {
  pair: string;
  coefficient: number;
  strength: 'weak' | 'moderate' | 'strong' | 'inverse';
  significance: number;
}

export interface SessionTimingRecommendation {
  mode: SessionMode;
  duration: number;
  priority: string[];
  opportunities: string[];
  risks: string[];
  checkBackIn: number;
  rationale: string;
}

// Trend Analyzer
export class TrendAnalyzer {
  private history: TrendPoint[] = [];
  private maxHistory = 20;

  addSnapshot(snapshot: EconomicSnapshot): void {
    this.history.push({
      timestamp: new Date(snapshot.capturedAt).getTime(),
      btcUsd: snapshot.crypto?.bitcoin.usd ?? 0,
      ethUsd: snapshot.crypto?.ethereum.usd ?? 0,
      sp500: snapshot.indices?.sp500.value ?? null,
      vix: snapshot.indices?.vix.value ?? null,
      volatility: (snapshot.crypto?.bitcoin.change24h ?? 0) + (snapshot.crypto?.ethereum.change24h ?? 0)
    });
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  analyzeTrend(asset: 'btc' | 'eth'): TrendAnalysis {
    if (this.history.length < 3) {
      return { direction: 'sideways', strength: 0, momentum: 0, duration: 0, confidence: 0.5 };
    }

    const prices = this.history
      .map(p => asset === 'btc' ? p.btcUsd : p.ethUsd)
      .filter((p): p is number => p > 0);

    if (prices.length < 3) {
      return { direction: 'sideways', strength: 0, momentum: 0, duration: 0, confidence: 0.3 };
    }

    const momentum = this.calculateSlope(prices.slice(-5));
    const direction = momentum > 0.001 ? 'up' : momentum < -0.001 ? 'down' : 'sideways';
    const variance = this.calculateVariance(prices);
    const firstPrice = prices[0] ?? 1;
    const strength = Math.min(1, 1 / (1 + (variance / (firstPrice ** 2) * 1000)));

    let duration = 0;
    for (let i = prices.length - 1; i > 0; i--) {
      const current = prices[i]!;
      const previous = prices[i - 1]!;
      if (this.getDirection(current, previous) === direction) {
        duration++;
      } else {
        break;
      }
    }

    return {
      direction,
      strength,
      momentum,
      duration,
      confidence: Math.min(1, (prices.length / 10) * strength)
    };
  }

  detectReversal(asset: 'btc' | 'eth'): { detected: boolean; strength: number } {
    if (this.history.length < 6) return { detected: false, strength: 0 };

    const prices = this.history
      .map(p => asset === 'btc' ? p.btcUsd : p.ethUsd)
      .filter((p): p is number => p > 0);

    if (prices.length < 6) return { detected: false, strength: 0 };

    const prev = prices.slice(-6, -3);
    const recent = prices.slice(-3);

    if (prev.length < 3 || recent.length < 3) return { detected: false, strength: 0 };

    const firstPrev = prev[0]!;
    const lastPrev = prev[prev.length - 1]!;
    const firstRecent = recent[0]!;
    const lastRecent = recent[recent.length - 1]!;

    const prevChange = (lastPrev - firstPrev) / firstPrev;
    const recentChange = (lastRecent - firstRecent) / firstRecent;

    const prevDir = prevChange > 0.0005 ? 'up' : prevChange < -0.0005 ? 'down' : 'sideways';
    const recentDir = recentChange > 0.0005 ? 'up' : recentChange < -0.0005 ? 'down' : 'sideways';

    if (prevDir !== 'sideways' && prevDir !== recentDir) {
      return { detected: true, strength: Math.abs(recentChange) };
    }

    return { detected: false, strength: 0 };
  }

  private calculateSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;
    const mid = Math.floor(n / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    return secondAvg - firstAvg;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  }

  private getDirection(current: number, previous: number): 'up' | 'down' | 'sideways' {
    const change = (current - previous) / previous;
    if (change > 0.0005) return 'up';
    if (change < -0.0005) return 'down';
    return 'sideways';
  }

  getHistory(): TrendPoint[] { return [...this.history]; }
}

// Forecast Engine
export class ForecastEngine {
  private trendAnalyzer: TrendAnalyzer;

  constructor(trendAnalyzer: TrendAnalyzer) {
    this.trendAnalyzer = trendAnalyzer;
  }

  forecast(horizon: '1h' | '4h' | '24h' = '1h'): Forecast {
    const btcTrend = this.trendAnalyzer.analyzeTrend('btc');
    const ethTrend = this.trendAnalyzer.analyzeTrend('eth');

    const makePrediction = (trend: TrendAnalysis): Forecast['btcPrediction'] => {
      if (trend.confidence < 0.3) {
        return { direction: 'stable', magnitude: 0, confidence: trend.confidence };
      }
      const dir: 'up' | 'down' | 'stable' = trend.momentum > 0.001 ? 'up' : trend.momentum < -0.001 ? 'down' : 'stable';
      const magnitude = Math.min(5, Math.abs(trend.momentum) * 100 * trend.strength);
      return { direction: dir, magnitude, confidence: trend.confidence * trend.strength };
    };

    const btcPrediction = makePrediction(btcTrend);
    const ethPrediction = makePrediction(ethTrend);

    let recommendedAction = 'FLOW: Stable conditions';
    if (btcPrediction.direction === ethPrediction.direction && btcPrediction.direction !== 'stable') {
      if ((btcPrediction.confidence + ethPrediction.confidence) / 2 > 0.6) {
        recommendedAction = `FLOW PROBABLE: Strong ${btcPrediction.direction}ward momentum`;
      }
    }

    return {
      timeHorizon: horizon,
      btcPrediction,
      ethPrediction,
      volatilityPrediction: 'stable',
      recommendedAction
    };
  }
}

// Correlation Analyzer
export class CorrelationAnalyzer {
  private trendAnalyzer: TrendAnalyzer;

  constructor(trendAnalyzer: TrendAnalyzer) {
    this.trendAnalyzer = trendAnalyzer;
  }

  calculateCorrelation(asset1: 'btc' | 'eth' | 'sp500', asset2: 'btc' | 'eth' | 'sp500'): AssetCorrelation {
    const history = this.trendAnalyzer.getHistory();
    if (history.length < 5) {
      return { pair: `${asset1}-${asset2}`, coefficient: 0, strength: 'weak', significance: 0 };
    }

    const getValues = (asset: string): number[] => {
      return history
        .map(p => {
          if (asset === 'btc') return p.btcUsd;
          if (asset === 'eth') return p.ethUsd;
          return p.sp500 ?? 0;
        })
        .filter((v): v is number => v > 0);
    };

    const values1 = getValues(asset1);
    const values2 = getValues(asset2);
    const n = Math.min(values1.length, values2.length);

    if (n < 3) {
      return { pair: `${asset1}-${asset2}`, coefficient: 0, strength: 'weak', significance: history.length / 20 };
    }

    const x = values1.slice(0, n);
    const y = values2.slice(0, n);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * (y[i] ?? 0), 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);

    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const coefficient = den === 0 ? 0 : num / den;

    const abs = Math.abs(coefficient);
    let strength: AssetCorrelation['strength'] = abs > 0.7 ? 'strong' : abs > 0.4 ? 'moderate' : 'weak';
    if (coefficient < -0.3 && abs > 0.3) strength = 'inverse';

    return {
      pair: `${asset1}-${asset2}`,
      coefficient,
      strength,
      significance: Math.min(1, history.length / 20)
    };
  }

  findAllCorrelations(): AssetCorrelation[] {
    const pairs: [string, string][] = [['btc', 'eth'], ['btc', 'sp500'], ['eth', 'sp500']];
    return pairs
      .map(([a, b]) => this.calculateCorrelation(a as 'btc' | 'eth' | 'sp500', b as 'btc' | 'eth' | 'sp500'))
      .filter(c => Math.abs(c.coefficient) > 0.2);
  }
}

// Session Planner
export class SessionPlanner {
  private trendAnalyzer: TrendAnalyzer;
  private forecastEngine: ForecastEngine;
  private correlationAnalyzer: CorrelationAnalyzer;

  constructor() {
    this.trendAnalyzer = new TrendAnalyzer();
    this.forecastEngine = new ForecastEngine(this.trendAnalyzer);
    this.correlationAnalyzer = new CorrelationAnalyzer(this.trendAnalyzer);
  }

  getTrendAnalyzer() { return this.trendAnalyzer; }
  getForecastEngine() { return this.forecastEngine; }
  getCorrelationAnalyzer() { return this.correlationAnalyzer; }

  planSession(snapshot: EconomicSnapshot): SessionTimingRecommendation {
    this.trendAnalyzer.addSnapshot(snapshot);

    const timing = analyzeTiming(snapshot);
    const forecast = this.forecastEngine.forecast('1h');
    const correlations = this.correlationAnalyzer.findAllCorrelations();
    const btcTrend = this.trendAnalyzer.analyzeTrend('btc');
    const reversal = this.trendAnalyzer.detectReversal('btc');

    let duration = 60;
    let checkBackIn = 30;
    if (timing.mode === 'flow') { duration = 90; checkBackIn = 60; }
    else if (timing.mode === 'defensive') { duration = 30; checkBackIn = 15; }

    const opportunities: string[] = [];
    const risks: string[] = [];

    if (btcTrend.direction === 'up' && btcTrend.strength > 0.6) {
      opportunities.push('Strong upward momentum - optimal for extension work');
    }
    if (reversal.detected) {
      risks.push(`Reversal detected (${(reversal.strength * 100).toFixed(2)}%) - conditions may shift`);
    }
    if (correlations.some(c => c.strength === 'strong')) {
      const strong = correlations.find(c => c.strength === 'strong');
      if (strong) opportunities.push(`Strong ${strong.pair} correlation (${strong.coefficient.toFixed(2)})`);
    }

    let rationale = `Current mode: ${timing.mode}`;
    if (btcTrend.duration > 2) {
      rationale += ` | BTC ${btcTrend.direction}ward trend for ${btcTrend.duration} snapshots`;
    }

    return {
      mode: timing.mode,
      duration,
      priority: MODE_DESCRIPTIONS[timing.mode].permitted.slice(0, 2),
      opportunities: opportunities.length > 0 ? opportunities : ['Stable environment'],
      risks: risks.length > 0 ? risks : ['No significant risks'],
      checkBackIn,
      rationale
    };
  }

  formatFullReport(recommendation: SessionTimingRecommendation): string {
    const lines = [
      '╔' + '═'.repeat(58) + '╗',
      '║' + ' '.repeat(15) + 'NEXUS PREDICTIVE ANALYTICS' + ' '.repeat(16) + '║',
      '╠' + '═'.repeat(58) + '╣',
      '',
      'SESSION TIMING RECOMMENDATION',
      '',
      `   Mode:        ${MODE_DESCRIPTIONS[recommendation.mode].label}`,
      `   Duration:    ${recommendation.duration} minutes`,
      `   Check Back:  Every ${recommendation.checkBackIn} minutes`,
      '',
      'PRIORITY FOCUS',
      ...recommendation.priority.map(p => `   • ${p}`),
      '',
      'OPPORTUNITIES',
      ...recommendation.opportunities.map(o => `   • ${o}`),
      '',
      'RISKS',
      ...recommendation.risks.map(r => `   • ${r}`),
      '',
      'RATIONALE',
      `   ${recommendation.rationale}`,
      '',
    ];

    const correlations = this.correlationAnalyzer.findAllCorrelations();
    if (correlations.length > 0) {
      lines.push('CORRELATIONS');
      correlations.forEach(c => {
        const symbol = c.coefficient > 0 ? '↗️' : '↘️';
        lines.push(`   ${symbol} ${c.pair}: ${c.strength} (${c.coefficient.toFixed(3)})`);
      });
    }

    lines.push('╚' + '═'.repeat(58) + '╝');
    return lines.join('\n');
  }
}

// Backwards compatibility
export const PredictiveTiming = {
  analyze: analyzeTiming,
  calculateVolatility,
  volatilityToMode,
  levelToMode,
  format: formatTimingAnalysis,
  thresholds: VOLATILITY_THRESHOLDS,
  modes: MODE_DESCRIPTIONS
};

export const PredictiveAnalytics = {
  SessionPlanner,
  TrendAnalyzer,
  ForecastEngine,
  CorrelationAnalyzer,
  analyze: analyzeTiming,
  calculateVolatility,
  volatilityToMode,
  levelToMode,
  format: formatTimingAnalysis,
  thresholds: VOLATILITY_THRESHOLDS,
  modes: MODE_DESCRIPTIONS
};

export default PredictiveAnalytics;
