/**
 * Market Simulation Module
 * Multi-agent market simulation with event-driven architecture.
 * 
 * Features:
 * - Multiple agent types (suppliers, demand, arbitrageurs, external shocks)
 * - Decoupled event-based communication
 * - Time series persistence via SQLite
 * - Statistical analysis of market data
 * - Matching engine with price-time priority
 */

// Core components
export { EventBus, createEventBus } from './event_bus';
export { TimeSeriesStorage, createStorage } from './storage';
export { MarketSimulation } from './simulation';
export { MatchingEngine } from './matching_engine';

// Statistics
export {
  mean,
  median,
  stdDev,
  skewness,
  kurtosis,
  descriptiveStats,
  linearRegression,
  analyzeTrend,
  rollingAverage,
  exponentialMovingAverage,
  bollingerBands,
  calculateReturns,
  historicalVolatility,
  analyzeVolatility,
  correlation,
  autocorrelation,
  sharpeRatio,
  maxDrawdown,
  calculateRSI,
  fibonacciRetracement,
  findSupportResistance,
} from './statistics';

// Agents
export { BaseAgent } from './agents/base';
export { SupplierAgent } from './agents/supplier';
export { DemandAgent } from './agents/demand';
export { ArbitrageurAgent } from './agents/arbitrageur';
export { ExternalShockAgent } from './agents/external';

// Types
export type {
  MarketState,
  Order,
  Trade,
  AgentType,
  AgentConfig,
  AgentState,
  AgentDecision,
  EventType,
  MarketEvent,
  PriceUpdatePayload,
  ExternalShockPayload,
  ArbitragePayload,
  TimeSeriesPoint,
  DescriptiveStats,
  TrendAnalysis,
  VolatilityAnalysis,
  SimulationConfig,
  SimulationReport,
  AgentSummary,
  Snapshot,
  Listener,
} from './types';
