/**
 * Statistical Analysis
 * Mathematical and statistical functions for analyzing market data.
 */

import type { 
  TimeSeriesPoint, 
  DescriptiveStats, 
  TrendAnalysis, 
  VolatilityAnalysis 
} from './types';

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const a = sorted[mid - 1] ?? 0;
    const b = sorted[mid] ?? 0;
    return (a + b) / 2;
  }
  return sorted[mid] ?? 0;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function skewness(values: number[]): number {
  if (values.length < 3) return 0;
  const m = mean(values);
  const s = stdDev(values);
  if (s === 0) return 0;
  
  const n = values.length;
  const sum = values.reduce((acc, v) => acc + Math.pow((v - m) / s, 3), 0);
  return sum / n;
}

export function kurtosis(values: number[]): number {
  if (values.length < 4) return 0;
  const m = mean(values);
  const s = stdDev(values);
  if (s === 0) return 0;
  
  const n = values.length;
  const sum = values.reduce((acc, v) => acc + Math.pow((v - m) / s, 4), 0);
  return sum / n - 3;
}

export function descriptiveStats(values: number[]): DescriptiveStats {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      range: 0,
      skewness: 0,
      kurtosis: 0,
    };
  }

  const m = mean(values);
  const med = median(values);
  const std = stdDev(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return {
    mean: m,
    median: med,
    stdDev: std,
    min,
    max,
    range,
    skewness: skewness(values),
    kurtosis: kurtosis(values),
  };
}

export function linearRegression(data: TimeSeriesPoint[]): { 
  slope: number; 
  intercept: number; 
  rSquared: number;
} {
  const n = data.length;
  if (n < 2) {
    const first = data[0];
    return { slope: 0, intercept: first?.value ?? 0, rSquared: 0 };
  }

  const x = data.map((_, i) => i);
  const y = data.map(d => d.value);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * (y[i] ?? 0), 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - sumY / n, 2), 0);
  const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * (x[i] ?? 0) + intercept), 2), 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared };
}

export function analyzeTrend(data: TimeSeriesPoint[]): TrendAnalysis {
  if (data.length < 10) {
    return {
      direction: 'sideways',
      slope: 0,
      intercept: 0,
      rSquared: 0,
      confidence: 0,
    };
  }

  const { slope, intercept, rSquared } = linearRegression(data);
  
  const typicalValue = Math.abs(mean(data.map(d => d.value))) || 1;
  const normalizedSlope = slope / typicalValue;

  let direction: 'upward' | 'downward' | 'sideways' = 'sideways';
  if (normalizedSlope > 0.01) direction = 'upward';
  else if (normalizedSlope < -0.01) direction = 'downward';

  const confidence = Math.sqrt(rSquared) * Math.min(1, data.length / 100);

  return {
    direction,
    slope,
    intercept,
    rSquared,
    confidence,
  };
}

export function rollingAverage(
  data: TimeSeriesPoint[], 
  windowSize: number
): TimeSeriesPoint[] {
  if (data.length === 0 || windowSize < 2) return data;

  const result: TimeSeriesPoint[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = data.slice(start, i + 1);
    const avg = mean(slice.map(d => d.value));
    const point = data[i];
    if (point) {
      result.push({
        tick: point.tick,
        timestamp: point.timestamp,
        value: avg,
      });
    }
  }
  
  return result;
}

export function exponentialMovingAverage(
  data: TimeSeriesPoint[],
  alpha = 0.2
): TimeSeriesPoint[] {
  if (data.length === 0) return [];

  const result: TimeSeriesPoint[] = [];
  const first = data[0];
  if (!first) return result;

  let ema = first.value;
  result.push({
    tick: first.tick,
    timestamp: first.timestamp,
    value: ema,
  });

  for (let i = 1; i < data.length; i++) {
    const point = data[i];
    if (!point) continue;
    ema = alpha * point.value + (1 - alpha) * ema;
    result.push({
      tick: point.tick,
      timestamp: point.timestamp,
      value: ema,
    });
  }

  return result;
}

export function bollingerBands(
  data: TimeSeriesPoint[],
  windowSize = 20,
  numStdDevs = 2
): Array<{ tick: number; timestamp: number; upper: number; middle: number; lower: number }> {
  if (data.length < windowSize) return [];

  const result: Array<{ tick: number; timestamp: number; upper: number; middle: number; lower: number }> = [];

  for (let i = windowSize - 1; i < data.length; i++) {
    const slice = data.slice(i - windowSize + 1, i + 1);
    const values = slice.map(d => d.value);
    const m = mean(values);
    const s = stdDev(values);

    const point = data[i]!;
    result.push({
      tick: point.tick,
      timestamp: point.timestamp,
      upper: m + numStdDevs * s,
      middle: m,
      lower: m - numStdDevs * s,
    });
  }

  return result;
}

export function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (prev !== undefined && curr !== undefined && prev !== 0) {
      returns.push((curr - prev) / prev);
    }
  }
  return returns;
}

export function historicalVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  return stdDev(returns) * Math.sqrt(returns.length);
}

export function analyzeVolatility(
  data: TimeSeriesPoint[]
): VolatilityAnalysis {
  if (data.length < 2) {
    return {
      historicalVolatility: 0,
      realizedVolatility: 0,
      volatilityTrend: 'stable',
    };
  }

  const prices = data.map(d => d.value);
  const returns = calculateReturns(prices);
  
  const hv = historicalVolatility(returns);
  
  const ranges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (prev !== undefined && curr !== undefined) {
      ranges.push(Math.abs(curr - prev));
    }
  }
  const rv = mean(ranges);

  const firstHalf = returns.slice(0, Math.floor(returns.length / 2));
  const secondHalf = returns.slice(Math.floor(returns.length / 2));
  
  const firstVol = stdDev(firstHalf);
  const secondVol = stdDev(secondHalf);
  
  let volatilityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (firstVol > 0) {
    const ratio = secondVol / firstVol;
    if (ratio > 1.2) volatilityTrend = 'increasing';
    else if (ratio < 0.8) volatilityTrend = 'decreasing';
  }

  return {
    historicalVolatility: hv,
    realizedVolatility: rv,
    volatilityTrend,
  };
}

export function correlation(
  series1: number[],
  series2: number[]
): number {
  const n = Math.min(series1.length, series2.length);
  if (n === 0) return 0;

  const s1 = series1.slice(0, n);
  const s2 = series2.slice(0, n);

  const m1 = mean(s1);
  const m2 = mean(s2);

  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;

  for (let i = 0; i < n; i++) {
    const v1 = s1[i];
    const v2 = s2[i];
    if (v1 === undefined || v2 === undefined) continue;
    const diff1 = v1 - m1;
    const diff2 = v2 - m2;
    numerator += diff1 * diff2;
    denom1 += diff1 * diff1;
    denom2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(denom1 * denom2);
  return denominator === 0 ? 0 : numerator / denominator;
}

export function autocorrelation(data: number[], lag: number): number {
  if (data.length <= lag) return 0;
  const series = data.slice(lag);
  const lagged = data.slice(0, data.length - lag);
  return correlation(series, lagged);
}

export function sharpeRatio(
  returns: number[],
  riskFreeRate = 0
): number {
  const avgReturn = mean(returns) - riskFreeRate;
  const vol = stdDev(returns);
  return vol === 0 ? 0 : avgReturn / vol;
}

export function maxDrawdown(prices: number[]): { amount: number; percent: number } {
  if (prices.length < 2) return { amount: 0, percent: 0 };

  let peak = prices[0] ?? 0;
  let maxDd = 0;
  let maxDdPercent = 0;

  for (const price of prices) {
    if (price > peak) {
      peak = price;
    } else {
      const drawdown = peak - price;
      if (drawdown > maxDd) {
        maxDd = drawdown;
        maxDdPercent = (peak !== 0) ? (drawdown / peak) : 0;
      }
    }
  }

  return { amount: maxDd, percent: maxDdPercent };
}

export function calculateRSI(prices: number[], period = 14): number[] {
  if (prices.length < period + 1) return [];

  const rsi: number[] = [];
  const changes: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (prev !== undefined && curr !== undefined) {
      changes.push(curr - prev);
    }
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change !== undefined) {
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change === undefined) continue;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

export function fibonacciRetracement(
  high: number,
  low: number
): { level: number; price: number }[] {
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const range = high - low;

  return levels.map(level => ({
    level,
    price: high - level * range,
  }));
}

export function findSupportResistance(
  data: TimeSeriesPoint[],
  windowSize = 5
): { supports: number[]; resistances: number[] } {
  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = windowSize; i < data.length - windowSize; i++) {
    const window = data.slice(i - windowSize, i + windowSize + 1);
    const values = window.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const center = data[i];
    if (!center) continue;

    if (center.value === min && !supports.includes(center.value)) {
      supports.push(center.value);
    }
    if (center.value === max && !resistances.includes(center.value)) {
      resistances.push(center.value);
    }
  }

  return { supports, resistances };
}
