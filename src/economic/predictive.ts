/**
 * Predictive Timing System
 * Nexus Economic Intelligence - Volatility-Aware Session Planning
 * 
 * Maps external market volatility to internal session modes.
 * Core concept: "Agential Situatedness" - the situated agent acts 
 * upon its conditions by adapting behavior to external stability.
 */

import type { EconomicSnapshot } from './types';

/** Session operating modes based on external volatility */
export type SessionMode = 
  | 'flow'           // Normal operation, all activities permitted
  | 'cautious'       // Moderate tension, prioritize maintenance
  | 'defensive';     // High volatility, documentation/archival only

/** Volatility level classification */
export type VolatilityLevel = 
  | 'stable'         // <= 1% combined movement
  | 'moderate'       // 1-3% combined movement  
  | 'high';          // > 3% combined movement

/** Volatility thresholds */
export const VOLATILITY_THRESHOLDS = {
  STABLE_MAX: 1.0,      // At or below this = stable construction window
  MODERATE_MAX: 3.0,    // At or below this = cautious, above = defensive
} as const;

/** Mode descriptions for session planning */
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

/** Result of volatility analysis */
export interface TimingAnalysis {
  mode: SessionMode;
  volatility: VolatilityLevel;
  combinedChange: number;  // Absolute sum of BTC+ETH % changes
  btcChange: number;
  ethChange: number;
  recommendation: string;
  confidence: number;     // 0-1, how reliable the signal is
}

/**
 * Calculate combined volatility from a snapshot
 * Uses absolute sum of BTC and ETH 24h changes
 */
export function calculateVolatility(snapshot: EconomicSnapshot): {
  btcChange: number;
  ethChange: number;
  combined: number;
} {
  const btcChange = Math.abs(snapshot.crypto?.bitcoin.change24h ?? 0);
  const ethChange = Math.abs(snapshot.crypto?.ethereum.change24h ?? 0);
  const combined = btcChange + ethChange;
  
  return { btcChange, ethChange, combined };
}

/**
 * Determine volatility level from combined percentage
 * stable: <= 1.0%
 * moderate: >1.0% and <= 3.0%
 * high: > 3.0%
 */
export function volatilityToMode(volatility: number): VolatilityLevel {
  if (volatility <= VOLATILITY_THRESHOLDS.STABLE_MAX) {
    return 'stable';
  } else if (volatility <= VOLATILITY_THRESHOLDS.MODERATE_MAX) {
    return 'moderate';
  }
  return 'high';
}

/**
 * Map volatility level to session mode
 */
export function levelToMode(level: VolatilityLevel): SessionMode {
  switch (level) {
    case 'stable':
      return 'flow';
    case 'moderate':
      return 'cautious';
    case 'high':
      return 'defensive';
  }
}

/**
 * Generate a recommendation based on timing analysis
 */
function generateRecommendation(mode: SessionMode, level: VolatilityLevel): string {
  const desc = MODE_DESCRIPTIONS[mode];
  
  if (level === 'stable') {
    return `${desc.label}: ${desc.description} Recommended: ${desc.permitted.join(', ')}`;
  } else if (level === 'moderate') {
    return `${desc.label}: ${desc.description} Prioritize: ${desc.permitted.join(', ')}. Avoid: ${desc.restricted.join(', ')}`;
  }
  return `${desc.label}: ${desc.description} RESTRICTED: ${desc.restricted.join(', ')}. Only: ${desc.permitted.join(', ')}`;
}

/**
 * Calculate confidence based on data quality and time since capture
 */
function calculateConfidence(snapshot: EconomicSnapshot): number {
  const now = new Date().getTime();
  const captured = new Date(snapshot.capturedAt).getTime();
  const minutesSince = (now - captured) / (1000 * 60);
  
  // Confidence decays with time
  let confidence = 1.0;
  if (minutesSince > 60) {
    confidence = 0.9;
  }
  if (minutesSince > 180) {
    confidence = 0.7;
  }
  if (minutesSince > 480) {
    confidence = 0.5;
  }
  
  // Reduce if missing data
  if (!snapshot.crypto?.bitcoin.change24h || !snapshot.crypto?.ethereum.change24h) {
    confidence *= 0.5;
  }
  
  return confidence;
}

/**
 * Main predictive timing function
 * Takes an EconomicSnapshot and returns session mode recommendation
 */
export function analyzeTiming(snapshot: EconomicSnapshot): TimingAnalysis {
  const volatility = calculateVolatility(snapshot);
  const level = volatilityToMode(volatility.combined);
  const mode = levelToMode(level);
  
  return {
    mode,
    volatility: level,
    combinedChange: volatility.combined,
    btcChange: volatility.btcChange,
    ethChange: volatility.ethChange,
    recommendation: generateRecommendation(mode, level),
    confidence: calculateConfidence(snapshot)
  };
}

/**
 * Format timing analysis for display
 */
export function formatTimingAnalysis(analysis: TimingAnalysis): string {
  const lines = [
    '═'.repeat(50),
    ' PREDICTIVE TIMING ANALYSIS',
    '═'.repeat(50),
    '',
    `Session Mode:   ${MODE_DESCRIPTIONS[analysis.mode].label.toUpperCase()}`,
    `Volatility:     ${analysis.volatility.toUpperCase()} (${analysis.combinedChange.toFixed(2)}%)`,
    `  • BTC:        ${analysis.btcChange.toFixed(2)}%`,
    `  • ETH:        ${analysis.ethChange.toFixed(2)}%`,
    `Confidence:     ${(analysis.confidence * 100).toFixed(0)}%`,
    '',
    '─'.repeat(50),
    analysis.recommendation,
    `─`.repeat(50),
  ];
  
  return lines.join('\n');
}

export const PredictiveTiming = {
  analyze: analyzeTiming,
  calculateVolatility,
  volatilityToMode,
  levelToMode,
  format: formatTimingAnalysis,
  thresholds: VOLATILITY_THRESHOLDS,
  modes: MODE_DESCRIPTIONS
};

export default PredictiveTiming;
