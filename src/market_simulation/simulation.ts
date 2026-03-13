/**
 * Market Simulation Engine
 * Main simulation orchestrator.
 */

import { EventBus } from './event_bus';
import { TimeSeriesStorage } from './storage';
import { MatchingEngine } from './matching_engine';
import { SupplierAgent } from './agents/supplier';
import { DemandAgent } from './agents/demand';
import { ArbitrageurAgent } from './agents/arbitrageur';
import { ExternalShockAgent } from './agents/external';
import type { BaseAgent } from './agents/base';
import type {
  SimulationConfig,
  SimulationReport,
  MarketState,
  AgentConfig,
  AgentSummary,
  Order,
  AgentDecision,
} from './types';
import { descriptiveStats, analyzeVolatility, calculateReturns } from './statistics';

export class MarketSimulation {
  config: SimulationConfig;
  private eventBus: EventBus;
  private storage: TimeSeriesStorage;
  private matchingEngine: MatchingEngine;
  agents: BaseAgent[] = [];
  private state: MarketState;
  private priceHistory: number[] = [];
  private volumeHistory: number[] = [];
  private startTime: number = 0;

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = {
      ticks: 100,
      tickDelayMs: 0,
      initialPrice: 100,
      initialQuantity: 1000,
      maxPrice: 500,
      minPrice: 10,
      shockProbability: 0.05,
      dbPath: './market_simulation.db',
      ...config,
    };

    this.eventBus = new EventBus();
    
    this.storage = new TimeSeriesStorage({
      dbPath: this.config.dbPath,
      inMemory: false,
      maxSnapshots: 100,
    });

    this.matchingEngine = new MatchingEngine(this.eventBus);

    this.state = {
      tick: 0,
      timestamp: Date.now(),
      price: this.config.initialPrice,
      quantity: this.config.initialQuantity,
      volatility: 0.05,
      liquidity: 1.0,
      spread: 1.0,
    };
  }

  addAgent(agent: BaseAgent): void {
    this.agents.push(agent);
  }

  addSupplier(config: Partial<AgentConfig> = {}): SupplierAgent {
    const agentConfig: AgentConfig = {
      id: config.id ?? `supplier-${this.agents.filter(a => a.getType() === 'supplier').length}`,
      type: 'supplier',
      initialCapital: config.initialCapital ?? 50000,
      riskTolerance: config.riskTolerance ?? 0.6,
      reactionSpeed: config.reactionSpeed ?? 2,
    };

    const agent = new SupplierAgent(agentConfig, this.eventBus, {
      baseSupplyPrice: 100,
      priceElasticity: 1.5,
      maxInventory: 1000,
      minPrice: this.config.minPrice,
    });

    this.addAgent(agent);
    return agent;
  }

  addDemand(config: Partial<AgentConfig> = {}): DemandAgent {
    const agentConfig: AgentConfig = {
      id: config.id ?? `demand-${this.agents.filter(a => a.getType() === 'demand').length}`,
      type: 'demand',
      initialCapital: config.initialCapital ?? 50000,
      riskTolerance: config.riskTolerance ?? 0.6,
      reactionSpeed: config.reactionSpeed ?? 2,
    };

    const agent = new DemandAgent(agentConfig, this.eventBus, {
      baseDemandPrice: 100,
      priceElasticity: 1.0,
      maxBudget: config.initialCapital ?? 50000,
      maxPrice: this.config.maxPrice,
    });

    this.addAgent(agent);
    return agent;
  }

  addArbitrageur(config: Partial<AgentConfig> = {}): ArbitrageurAgent {
    const agentConfig: AgentConfig = {
      id: config.id ?? `arb-${this.agents.filter(a => a.getType() === 'arbitrageur').length}`,
      type: 'arbitrageur',
      initialCapital: config.initialCapital ?? 100000,
      riskTolerance: config.riskTolerance ?? 0.8,
      reactionSpeed: config.reactionSpeed ?? 1,
    };

    const agent = new ArbitrageurAgent(agentConfig, this.eventBus, {
      threshold: 0.02,
      maxPosition: 100,
      holdingPeriod: 10,
    });

    this.addAgent(agent);
    return agent;
  }

  addShockAgent(config: Partial<AgentConfig> = {}): ExternalShockAgent {
    const agentConfig: AgentConfig = {
      id: config.id ?? 'external-shock',
      type: 'external',
      initialCapital: config.initialCapital ?? 0,
      riskTolerance: config.riskTolerance ?? 1.0,
      reactionSpeed: config.reactionSpeed ?? 1,
    };

    const agent = new ExternalShockAgent(agentConfig, this.eventBus, {
      probability: this.config.shockProbability,
      minImpact: 0.05,
      maxImpact: 0.3,
    });

    this.addAgent(agent);
    return agent;
  }

  async run(): Promise<SimulationReport> {
    this.startTime = Date.now();

    this.eventBus.publish({
      type: 'SIMULATION_START',
      tick: 0,
      payload: {
        config: this.config,
        agentCount: this.agents.length,
      },
    });

    await this.recordState();

    for (let tick = 1; tick <= this.config.ticks; tick++) {
      await this.runTick(tick);
      
      if (this.config.tickDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.tickDelayMs));
      }
    }

    const endTime = Date.now();
    const duration = endTime - this.startTime;

    this.eventBus.publish({
      type: 'SIMULATION_END',
      tick: this.config.ticks,
      payload: {
        totalTrades: this.storage.getStats().trades,
        finalPrice: this.state.price,
        duration,
      },
    });

    this.agents.forEach(agent => agent.cleanup());
    
    return this.generateReport(duration);
  }

  private async runTick(tick: number): Promise<void> {
    this.state.tick = tick;
    this.state.timestamp = Date.now();

    const decisions = await this.gatherDecisions();
    const shockImpacts = this.calculateShockImpacts();
    this.applyShockImpacts(shockImpacts);

    const orders = this.generateOrders(decisions);
    orders.forEach(order => this.matchingEngine.submitOrder(order));

    const { trades, stateUpdate } = this.matchingEngine.matchOrders(tick);

    if (trades.length > 0) {
      const oldPrice = this.state.price;
      this.state.price = stateUpdate.price;
      this.state.quantity = trades.reduce((sum, t) => sum + t.quantity, this.state.quantity);
      this.state.spread = stateUpdate.spread;
      
      this.priceHistory.push(this.state.price);
      this.volumeHistory.push(trades.length);

      if (this.priceHistory.length >= 10) {
        const returns = calculateReturns(this.priceHistory.slice(-20));
        this.state.volatility = returns.length > 0 
          ? Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length)
          : 0.05;
      }

      this.eventBus.publish({
        type: 'PRICE_UPDATE',
        tick,
        payload: {
          oldPrice,
          newPrice: this.state.price,
          changePercent: oldPrice > 0 ? ((this.state.price - oldPrice) / oldPrice * 100) : 0,
          volume: stateUpdate.volume,
        },
      });
    }

    await this.recordState();

    this.eventBus.publish({
      type: 'TICK_COMPLETE',
      tick,
      payload: {
        tradeCount: trades.length,
        price: this.state.price,
        volatility: this.state.volatility,
      },
    });
  }

  private gatherDecisions(): Array<{ agent: BaseAgent; decision: AgentDecision }> {
    return this.agents.map(agent => ({
      agent,
      decision: agent.decide(this.state),
    }));
  }

  private calculateShockImpacts(): { priceMultiplier: number; volatilityMultiplier: number; liquidityMultiplier: number } {
    let combined = { priceMultiplier: 1, volatilityMultiplier: 1, liquidityMultiplier: 1 };

    for (const agent of this.agents) {
      if (agent.getType() === 'external') {
        const shockAgent = agent as ExternalShockAgent;
        const impacts = shockAgent.calculateImpact();
        combined.priceMultiplier *= impacts.priceMultiplier;
        combined.volatilityMultiplier *= impacts.volatilityMultiplier;
        combined.liquidityMultiplier *= impacts.liquidityMultiplier;
      }
    }

    return combined;
  }

  private applyShockImpacts(impacts: { priceMultiplier: number; volatilityMultiplier: number; liquidityMultiplier: number }): void {
    this.state.price = Math.max(
      this.config.minPrice,
      Math.min(this.config.maxPrice, this.state.price * impacts.priceMultiplier)
    );
    this.state.volatility = Math.max(0.001, this.state.volatility * impacts.volatilityMultiplier);
    this.state.liquidity = Math.max(0.1, Math.min(10, this.state.liquidity * impacts.liquidityMultiplier));
  }

  private generateOrders(decisions: Array<{ agent: BaseAgent; decision: AgentDecision }>): Order[] {
    const orders: Order[] = [];

    for (const { decision } of decisions) {
      if (decision.action === 'buy' || decision.action === 'sell') {
        if (decision.price && decision.quantity) {
          orders.push({
            id: `${decision.action}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            agentId: decision.action === 'buy' ? 'buyer' : 'seller',
            type: decision.action,
            price: decision.price,
            quantity: decision.quantity,
            timestamp: this.state.tick,
          });
        }
      }
    }

    return orders;
  }

  private async recordState(): Promise<void> {
    this.storage.saveMarketState(this.state);

    for (const agent of this.agents) {
      this.storage.saveAgentState(this.state.tick, agent.getId(), agent.getState());
    }

    this.storage.saveSnapshot({
      tick: this.state.tick,
      timestamp: Date.now(),
      market: { ...this.state },
      agents: Object.fromEntries(this.agents.map(a => [a.getId(), a.getState()])),
      activeOrders: [],
      recentTrades: [],
    });
  }

  private generateReport(duration: number): SimulationReport {
    const marketHistory = this.storage.getMarketHistory(1, this.config.ticks);
    const prices = marketHistory.map(m => m.price);
    const volumes = marketHistory.map(m => m.quantity);

    const priceStats = prices.length > 0 ? descriptiveStats(prices) : {
      mean: this.config.initialPrice,
      median: this.config.initialPrice,
      stdDev: 0,
      min: this.config.initialPrice,
      max: this.config.initialPrice,
      range: 0,
      skewness: 0,
      kurtosis: 0,
    };

    const volumeStats = volumes.length > 0 ? descriptiveStats(volumes.slice(1)) : {
      mean: this.config.initialQuantity,
      median: this.config.initialQuantity,
      stdDev: 0,
      min: this.config.initialQuantity,
      max: this.config.initialQuantity,
      range: 0,
      skewness: 0,
      kurtosis: 0,
    };

    analyzeVolatility(marketHistory.map(m => ({
      tick: m.tick,
      timestamp: m.timestamp,
      value: m.price,
    })));

    const volatilityStats = prices.length > 1 ? descriptiveStats(calculateReturns(prices).map(r => Math.abs(r))) : {
      mean: 0.05,
      median: 0.05,
      stdDev: 0.02,
      min: 0,
      max: 0.1,
      range: 0.1,
      skewness: 0,
      kurtosis: 0,
    };

    const agentSummaries: AgentSummary[] = this.agents.map(agent => {
      const state = agent.getState();
      const initial = state.config.initialCapital;
      const final = state.capital;
      const totalProfit = final - initial;
      const roi = initial > 0 ? (totalProfit / initial) : 0;
      const trades = state.tradesExecuted;
      const winRate = trades > 0 ? (totalProfit > 0 ? 1 : 0) : 0;

      return {
        agentId: agent.getId(),
        type: state.config.type,
        finalCapital: final,
        totalProfit,
        returnOnInvestment: roi * 100,
        tradesExecuted: trades,
        winRate: winRate * 100,
      };
    });

    agentSummaries.forEach(summary => {
      const agent = this.agents.find(a => a.getId() === summary.agentId);
      if (agent) {
        const state = agent.getState();
        this.storage.saveAgentSummary({
          agentId: summary.agentId,
          type: summary.type,
          initialCapital: state.config.initialCapital ?? 0,
          finalCapital: summary.finalCapital,
          totalProfit: summary.totalProfit,
          totalTrades: summary.tradesExecuted,
          winRate: summary.winRate / 100,
        });
      }
    });

    return {
      config: this.config,
      duration,
      finalState: { ...this.state },
      totalTrades: this.storage.getStats().trades,
      priceChange: prices.length > 1 
        ? ((prices[prices.length - 1]! - prices[0]!) / prices[0]! * 100)
        : 0,
      volatility: volatilityStats,
      priceStats,
      volumeStats,
      agentSummaries,
    };
  }

  getState(): MarketState {
    return { ...this.state };
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getStorage(): TimeSeriesStorage {
    return this.storage;
  }

  getStats(): ReturnType<typeof this.storage.getStats> {
    return this.storage.getStats();
  }

  cleanup(): void {
    this.agents.forEach(agent => agent.cleanup());
    this.storage.close();
  }
}
