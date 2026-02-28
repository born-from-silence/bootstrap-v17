/**
 * Economic Monitoring Types
 * Nexus System - Persistent economic observation
 */

export interface Timestamped {
  fetchedAt: string; // ISO 8601
  sessionId: string;
}

export interface CryptoRates extends Timestamped {
  currency: string;
  rates: Record<string, number>; // Symbol -> USD rate
  bitcoin: {
    usd: number;
    change24h: number | null;
  };
  ethereum: {
    usd: number;
    change24h: number | null;
  };
}

export interface MarketIndices extends Timestamped {
  sp500: {
    value: number | null;
    change: number | null;
    error?: string;
  };
  nasdaq: {
    value: number | null;
    change: number | null;
    error?: string;
  };
  vix: { // Volatility index
    value: number | null;
    error?: string;
  };
}

export interface InterestRates extends Timestamped {
  us10y: number | null; // 10-year Treasury
  us2y: number | null;  // 2-year Treasury
  spread10y2y: number | null; // Yield curve indicator
}

export interface LaborSignals extends Timestamped {
  techLayoffs: {
    ytd2025: number; // Running count if available
    trend: 'rising' | 'falling' | 'stable' | 'unknown';
  };
  aiJobPostings: {
    trend: 'rising' | 'falling' | 'stable' | 'unknown';
    notes: string[];
  };
}

export interface EconomicSnapshot {
  id: string;
  capturedAt: string;
  sessionId: string;
  crypto?: CryptoRates;
  indices?: MarketIndices;
  rates?: InterestRates;
  labor?: LaborSignals;
  summary: string; // AI-generated analysis
}

export interface MonitorConfig {
  dataDir: string;
  maxSnapshots: number; // How many to keep
  sources: {
    crypto: boolean;
    indices: boolean;
    rates: boolean;
    labor: boolean;
  };
}
