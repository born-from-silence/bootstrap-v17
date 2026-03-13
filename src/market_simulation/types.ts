/**
 * Market Simulation Types
 * Core type definitions for the multi-agent market simulation.
 */

import type { EventBus as EventBusClass } from './event_bus';

// Re-export EventBus type
export type EventBus = EventBusClass;

// ============================================================================
// Core Market Types
// ============================================================================

export interface MarketState {
  tick: number;
  timestamp: number;
  price: number;
  quantity: number;
  volatility: number;
  liquidity: number;
  spread: number;
}

export interface Order {
  id: string;
  agentId: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  timestamp: number;
}

export interface Trade {
  id: string;
  buyerId: string;
  sellerId: string;
  price: number;
  quantity: number;
  timestamp: number;
}

// ============================================================================
// Agent Types
// ============================================================================

export type AgentType = 'supplier' | 'demand' | 'arbitrageur' | 'external';

export interface AgentConfig {
  id: string;
  type: AgentType;
  initialCapital: number;
  riskTolerance: number; // 0-1 scale
  reactionSpeed: number; // ticks to react
}

export interface AgentState {
  config: AgentConfig;
  capital: number;
  inventory: number;
  ordersPlaced: number;
  tradesExecuted: number;
  profit: number;
  lastActionTick: number;
}

export interface AgentDecision {
  action: 'buy' | 'sell' | 'hold' | 'shock';
  price?: number;
  quantity?: number;
  confidence: number;
  reasoning: string;
}

// ============================================================================
// Event Types
// ============================================================================

export type EventType = 
  | 'PRICE_UPDATE'
  | 'ORDER_PLACED'
  | 'TRADE_EXECUTED'
  | 'AGENT_DECISION'
  | 'EXTERNAL_SHOCK'
  | 'ARBITRAGE_DETECTED'
  | 'SIMULATION_START'
  | 'SIMULATION_END'
  | 'TICK_COMPLETE';

export interface MarketEvent {
  type: EventType;
  timestamp: number;
  tick: number;
  payload: unknown;
}

export interface PriceUpdatePayload {
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  volume: number;
}

export interface ExternalShockPayload {
  source: string;
  impact: number;
  duration: number;
  type: 'supply' | 'demand' | 'liquidity' | 'volatility';
  description: string;
}

export interface ArbitragePayload {
  arbitrageurId: string;
  priceDiscrepancy: number;
  opportunitySize: number;
  markets: string[];
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface TimeSeriesPoint {
  tick: number;
  timestamp: number;
  value: number;
}

export interface DescriptiveStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  skewness: number;
  kurtosis: number;
}

export interface TrendAnalysis {
  direction: 'upward' | 'downward' | 'sideways';
  slope: number;
  intercept: number;
  rSquared: number;
  confidence: number;
}

export interface VolatilityAnalysis {
  historicalVolatility: number;
  realizedVolatility: number;
  volatilityTrend: 'increasing' | 'decreasing' | 'stable';
  garchEstimate?: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface SimulationConfig {
  ticks: number;
  tickDelayMs: number;
  initialPrice: number;
  initialQuantity: number;
  maxPrice: number;
  minPrice: number;
  shockProbability: number;
  dbPath: string;
  randomSeed?: number;
}

export interface SimulationReport {
  config: SimulationConfig;
  duration: number;
  finalState: MarketState;
  totalTrades: number;
  priceChange: number;
  volatility: DescriptiveStats;
  priceStats: DescriptiveStats;
  volumeStats: DescriptiveStats;
  agentSummaries: AgentSummary[];
}

export interface AgentSummary {
  agentId: string;
  type: AgentType;
  finalCapital: number;
  totalProfit: number;
  returnOnInvestment: number;
  tradesExecuted: number;
  winRate: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface Snapshot {
  tick: number;
  timestamp: number;
  market: MarketState;
  agents: Record<string, AgentState>;
  activeOrders: Order[];
  recentTrades: Trade[];
}

export type Listener<T = unknown> = (event: MarketEvent) => void;
export type FilteredListener<T> = (payload: T, event: MarketEvent) => void;
