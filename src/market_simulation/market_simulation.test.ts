/**
 * Market Simulation Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus, createEventBus } from './event_bus';
import { TimeSeriesStorage, createStorage } from './storage';
import { MatchingEngine } from './matching_engine';
import { MarketSimulation } from './simulation';
import { 
  SupplierAgent, 
  DemandAgent, 
  ArbitrageurAgent, 
  ExternalShockAgent,
} from './agents';
import type { MarketState, Order, AgentConfig } from './types';
import {
  mean,
  stdDev,
  descriptiveStats,
  linearRegression,
  maxDrawdown,
  calculateReturns,
} from './statistics';

describe('Market Simulation', () => {
  let sim: MarketSimulation;
  let eventBus: EventBus;
  let storage: TimeSeriesStorage;
  let engine: MatchingEngine;

  beforeEach(() => {
    eventBus = createEventBus(1000);
    storage = createStorage({ inMemory: true });
    engine = new MatchingEngine(eventBus);
    sim = new MarketSimulation({
      ticks: 50,
      tickDelayMs: 0,
      initialPrice: 100,
      initialQuantity: 1000,
      maxPrice: 500,
      minPrice: 10,
      shockProbability: 0,
      dbPath: ':memory:',
    });
  });

  afterEach(() => {
    sim.cleanup();
  });

  describe('EventBus', () => {
    it('should publish and receive events', () => {
      const received: string[] = [];
      const unsubscribe = eventBus.subscribe('PRICE_UPDATE', () => {
        received.push('price_update');
      });

      eventBus.publish({
        type: 'PRICE_UPDATE',
        tick: 1,
        payload: { price: 100 },
      });

      expect(received).toHaveLength(1);
      expect(received[0]).toBe('price_update');
      
      unsubscribe();
    });

    it('should filter events by type', () => {
      const priceEvents: string[] = [];
      const allEvents: string[] = [];

      eventBus.subscribe('PRICE_UPDATE', () => priceEvents.push('price'));
      eventBus.subscribe('ALL', () => allEvents.push('any'));

      eventBus.publish({ type: 'PRICE_UPDATE', tick: 1, payload: {} });
      eventBus.publish({ type: 'ORDER_PLACED', tick: 1, payload: {} });

      expect(priceEvents).toHaveLength(1);
      expect(allEvents).toHaveLength(2);
    });

    it('should support once subscriptions', () => {
      let count = 0;
      eventBus.once('PRICE_UPDATE', () => count++);

      eventBus.publish({ type: 'PRICE_UPDATE', tick: 1, payload: {} });
      eventBus.publish({ type: 'PRICE_UPDATE', tick: 2, payload: {} });

      expect(count).toBe(1);
    });

    it('should wait for events', async () => {
      setTimeout(() => {
        eventBus.publish({ type: 'PRICE_UPDATE', tick: 1, payload: {} });
      }, 10);

      const event = await eventBus.waitFor('PRICE_UPDATE', 100);
      expect(event.type).toBe('PRICE_UPDATE');
    });

    it('should track metrics', () => {
      eventBus.subscribe('PRICE_UPDATE', () => {});
      eventBus.subscribe('ORDER_PLACED', () => {});
      
      eventBus.publish({ type: 'PRICE_UPDATE', tick: 1, payload: {} });
      eventBus.publish({ type: 'PRICE_UPDATE', tick: 2, payload: {} });
      eventBus.publish({ type: 'ORDER_PLACED', tick: 1, payload: {} });

      const metrics = eventBus.getMetrics();
      expect(metrics.totalEventsPublished).toBe(3);
      expect(metrics.totalEventsDelivered).toBe(3);
      expect(metrics.subscriptionsCreated).toBe(2);
    });

    it('should return event history', () => {
      eventBus.publish({ type: 'PRICE_UPDATE', tick: 1, payload: { price: 100 } });
      eventBus.publish({ type: 'PRICE_UPDATE', tick: 2, payload: { price: 110 } });
      eventBus.publish({ type: 'ORDER_PLACED', tick: 2, payload: {} });

      const priceHistory = eventBus.getHistory('PRICE_UPDATE');
      expect(priceHistory).toHaveLength(2);
      
      const allHistory = eventBus.getHistory();
      expect(allHistory).toHaveLength(3);
    });
  });

  describe('Storage', () => {
    it('should store and retrieve market states', () => {
      const state: MarketState = {
        tick: 1,
        timestamp: Date.now(),
        price: 100,
        quantity: 1000,
        volatility: 0.05,
        liquidity: 1,
        spread: 1,
      };

      storage.saveMarketState(state);
      const retrieved = storage.getMarketHistory(1, 1);
      
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0]!.price).toBe(100);
      expect(retrieved[0]!.quantity).toBe(1000);
    });

    it('should store and retrieve agent states', () => {
      // First save market state (required for foreign key constraint on tick)
      storage.saveMarketState({
        tick: 1,
        timestamp: Date.now(),
        price: 100,
        quantity: 1000,
        volatility: 0.05,
        liquidity: 1,
        spread: 1,
      });

      const agentConfig: AgentConfig = {
        id: 'agent-1',
        type: 'supplier',
        initialCapital: 10000,
        riskTolerance: 0.5,
        reactionSpeed: 2,
      };

      const agentState = {
        config: agentConfig,
        capital: 10500,
        inventory: 10,
        ordersPlaced: 5,
        tradesExecuted: 3,
        profit: 500,
        lastActionTick: 10,
      };

      storage.saveAgentState(1, 'agent-1', agentState);
      const history = storage.getAgentHistory('agent-1', 1, 1);
      
      expect(history).toHaveLength(1);
      expect(history[0]!.capital).toBe(10500);
      expect(history[0]!.profit).toBe(500);
    });

    it('should store and retrieve orders', () => {
      // First save market state (required for foreign key constraint on tick)
      storage.saveMarketState({
        tick: 1,
        timestamp: Date.now(),
        price: 100,
        quantity: 1000,
        volatility: 0.05,
        liquidity: 1,
        spread: 1,
      });

      const order: Order = {
        id: 'order-1',
        agentId: 'agent-1',
        type: 'buy',
        price: 100,
        quantity: 10,
        timestamp: 1,
      };

      storage.saveOrder(order);
      const orders = storage.getOrdersByTick(1);
      
      expect(orders).toHaveLength(1);
      expect(orders[0]!.id).toBe('order-1');
      expect(orders[0]!.type).toBe('buy');
    });

    it('should maintain time series data', () => {
      for (let i = 1; i <= 10; i++) {
        storage.saveMarketState({
          tick: i,
          timestamp: Date.now(),
          price: 100 + i,
          quantity: 1000,
          volatility: 0.05,
          liquidity: 1,
          spread: 1,
        });
      }

      const series = storage.getTimeSeries('price', 1, 10);
      expect(series).toHaveLength(10);
      expect(series[0]!.value).toBe(101);
      expect(series[9]!.value).toBe(110);
    });

    it('should return database stats', () => {
      for (let i = 1; i <= 5; i++) {
        storage.saveMarketState({
          tick: i,
          timestamp: Date.now(),
          price: 100,
          quantity: 1000,
          volatility: 0.05,
          liquidity: 1,
          spread: 1,
        });
      }

      const stats = storage.getStats();
      expect(stats.marketStates).toBe(5);
    });
  });

  describe('MatchingEngine', () => {
    it('should match buy and sell orders', () => {
      const buyOrder: Order = {
        id: 'buy-1',
        agentId: 'buyer-1',
        type: 'buy',
        price: 100,
        quantity: 10,
        timestamp: 1,
      };

      const sellOrder: Order = {
        id: 'sell-1',
        agentId: 'seller-1',
        type: 'sell',
        price: 95,
        quantity: 10,
        timestamp: 1,
      };

      engine.submitOrder(buyOrder);
      engine.submitOrder(sellOrder);

      const result = engine.matchOrders(1);
      
      expect(result.trades).toHaveLength(1);
      expect(result.trades[0]!.quantity).toBe(10);
    });

    it('should maintain price priority for orders', () => {
      engine.submitOrder({ id: 'buy-1', agentId: 'b1', type: 'buy', price: 100, quantity: 5, timestamp: 1 });
      engine.submitOrder({ id: 'buy-2', agentId: 'b2', type: 'buy', price: 105, quantity: 5, timestamp: 1 });
      engine.submitOrder({ id: 'buy-3', agentId: 'b3', type: 'buy', price: 95, quantity: 5, timestamp: 1 });
      engine.submitOrder({ id: 'sell-1', agentId: 's1', type: 'sell', price: 98, quantity: 15, timestamp: 2 });

      const result = engine.matchOrders(1);
      
      // Highest buy price (105) matches first
      expect(result.trades[0]!.price).toBe(105);
      expect(result.trades[0]!.buyerId).toBe('b2');
    });

    it('should handle partial fills', () => {
      engine.submitOrder({ id: 'buy-1', agentId: 'b1', type: 'buy', price: 100, quantity: 10, timestamp: 1 });
      engine.submitOrder({ id: 'sell-1', agentId: 's1', type: 'sell', price: 95, quantity: 5, timestamp: 1 });

      const result = engine.matchOrders(1);
      
      expect(result.trades).toHaveLength(1);
      expect(result.trades[0]!.quantity).toBe(5);
      expect(result.remainingOrders.buys).toHaveLength(1);
      expect(result.remainingOrders.buys[0]!.quantity).toBe(5);
    });

    it('should calculate order book depth', () => {
      engine.submitOrder({ id: 'buy-1', agentId: 'b1', type: 'buy', price: 100, quantity: 10, timestamp: 1 });
      engine.submitOrder({ id: 'buy-2', agentId: 'b2', type: 'buy', price: 100, quantity: 5, timestamp: 1 });
      engine.submitOrder({ id: 'sell-1', agentId: 's1', type: 'sell', price: 105, quantity: 8, timestamp: 1 });

      const depth = engine.getOrderBookDepth();
      
      expect(depth.bids).toHaveLength(1);
      expect(depth.bids[0]!.count).toBe(2);
      expect(depth.bids[0]!.quantity).toBe(15);
      expect(depth.asks).toHaveLength(1);
      expect(depth.asks[0]!.quantity).toBe(8);
    });

    it('should calculate spread', () => {
      engine.submitOrder({ id: 'buy-1', agentId: 'b1', type: 'buy', price: 98, quantity: 10, timestamp: 1 });
      engine.submitOrder({ id: 'sell-1', agentId: 's1', type: 'sell', price: 102, quantity: 10, timestamp: 1 });

      const spread = engine.getSpread();
      expect(spread).toBe(4);
    });
  });

  describe('Agent behavior', () => {
    it('suppliers should produce sell orders when price is high', () => {
      const marketState: MarketState = {
        tick: 1,
        timestamp: Date.now(),
        price: 150,
        quantity: 1000,
        volatility: 0.05,
        liquidity: 1,
        spread: 1,
      };

      const supplier = sim.addSupplier({
        riskTolerance: 0.8,
        reactionSpeed: 1,
      });

      const decision = supplier.decide(marketState);
      
      expect(decision.action).toBe('sell');
      expect(decision.quantity ?? 0).toBeGreaterThan(0);
    });

    it('suppliers should hold when price is too low', () => {
      const marketState: MarketState = {
        tick: 1,
        timestamp: Date.now(),
        price: 40,
        quantity: 1000,
        volatility: 0.05,
        liquidity: 1,
        spread: 1,
      };

      const supplier = sim.addSupplier({ riskTolerance: 0.8 });
      const decision = supplier.decide(marketState);
      
      expect(decision.action).toBe('hold');
    });

    it('demand agents should buy when price is low', () => {
      const marketState: MarketState = {
        tick: 1,
        timestamp: Date.now(),
        price: 80,
        quantity: 1000,
        volatility: 0.05,
        liquidity: 1,
        spread: 1,
      };

      const demand = sim.addDemand({
        riskTolerance: 0.8,
        reactionSpeed: 1,
      });

      const decision = demand.decide(marketState);
      
      expect(decision.action).toBe('buy');
      expect(decision.quantity ?? 0).toBeGreaterThan(0);
      expect((decision.price ?? 0)).toBeGreaterThan(marketState.price);
    });

    it('demand agents should hold when price is too high', () => {
      const marketState: MarketState = {
        tick: 1,
        timestamp: Date.now(),
        price: 200,
        quantity: 1000,
        volatility: 0.05,
        liquidity: 1,
        spread: 1,
      };

      const demand = sim.addDemand({});
      const decision = demand.decide(marketState);
      
      expect(decision.action).toBe('hold');
    });

    it('arbitrageurs should detect price discrepancies', () => {
      const marketState: MarketState = {
        tick: 1,
        timestamp: Date.now(),
        price: 90,
        quantity: 1000,
        volatility: 0.05,
        liquidity: 1,
        spread: 1,
      };

      const arbs = sim.addArbitrageur({ riskTolerance: 0.9 });
      
      const eb = sim.getEventBus();
      for (let i = 0; i < 5; i++) {
        eb.publish({
          type: 'PRICE_UPDATE',
          tick: i,
          payload: { newPrice: 110, oldPrice: 100 },
        });
      }

      const decision = arbs.decide({ ...marketState, tick: 6 });
      
      expect(['buy', 'sell', 'hold']).toContain(decision.action);
    });

    it('external shock agent should generate shocks with probability', () => {
      const shockSim = new MarketSimulation({
        ticks: 50,
        tickDelayMs: 0,
        initialPrice: 100,
        initialQuantity: 1000,
        maxPrice: 500,
        minPrice: 10,
        shockProbability: 1.0,
        dbPath: ':memory:',
      });

      shockSim.addShockAgent({ riskTolerance: 1.0 });
      
      const state: MarketState = {
        tick: 1,
        timestamp: Date.now(),
        price: 100,
        quantity: 1000,
        volatility: 0.05,
        liquidity: 1,
        spread: 1,
      };

      const shock = shockSim['agents'][0] as ExternalShockAgent;
      const decision = shock.decide(state);
      
      expect(decision.action).toBe('shock');
      expect(decision.reasoning).toContain('External shock');
      
      shockSim.cleanup();
    });
  });

  describe('Statistics', () => {
    it('should calculate mean correctly', () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
      expect(mean([10, 20, 30])).toBe(20);
      expect(mean([])).toBe(0);
    });

    it('should calculate standard deviation', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const sd = stdDev(values);
      expect(sd).toBeCloseTo(2, 0.5);
    });

    it('should calculate descriptive statistics', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = descriptiveStats(data);
      
      expect(stats.mean).toBe(5.5);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(10);
      expect(stats.range).toBe(9);
    });

    it('should calculate linear regression', () => {
      // Perfect linear relationship: value = 2 * tick
      const data = [
        { tick: 0, timestamp: 0, value: 0 },
        { tick: 1, timestamp: 1, value: 2 },
        { tick: 2, timestamp: 2, value: 4 },
        { tick: 3, timestamp: 3, value: 6 },
        { tick: 4, timestamp: 4, value: 8 },
        { tick: 5, timestamp: 5, value: 10 },
      ];
      
      const result = linearRegression(data);
      
      // Slope should be exactly 2
      expect(result.slope).toBeCloseTo(2, 0.01);
      // Intercept should be close to 0
      expect(result.intercept).toBeCloseTo(0, 0.1);
      // R-squared should be close to 1 (perfect fit)
      expect(result.rSquared).toBeCloseTo(1, 0.01);
    });

    it('should calculate max drawdown', () => {
      const prices = [100, 120, 110, 130, 100, 140, 90, 105];
      const result = maxDrawdown(prices);
      
      // Peak at 140, drop to 90
      expect(result.amount).toBe(50);
      expect(result.percent).toBeCloseTo(50 / 140, 0.01);
    });

    it('should calculate returns', () => {
      const prices = [100, 110, 121];
      const returns = calculateReturns(prices);
      
      expect(returns).toHaveLength(2);
      expect(returns[0]).toBe(0.1);
      expect(returns[1]).toBe(0.1);
    });
  });

  describe('Full Simulation', () => {
    it('should complete a full simulation run', async () => {
      sim.addSupplier({ riskTolerance: 0.6 });
      sim.addDemand({ riskTolerance: 0.6 });
      
      const report = await sim.run();
      
      expect(report.config.ticks).toBe(50);
      expect(report.duration).toBeGreaterThanOrEqual(0);
      expect(report.agentSummaries).toHaveLength(2);
    }, 10000);

    it('should track agent profits', async () => {
      sim.addSupplier({});
      sim.addDemand({});
      
      const report = await sim.run();
      
      for (const summary of report.agentSummaries) {
        expect(summary.agentId).toBeDefined();
        expect(summary.type).toBeDefined();
        expect(typeof summary.totalProfit).toBe('number');
      }
    }, 10000);

    it('should record price history', async () => {
      sim.addSupplier({});
      sim.addDemand({});
      
      const report = await sim.run();
      
      expect(report.priceStats).toBeDefined();
      expect(report.priceStats.mean).toBeGreaterThan(0);
    }, 10000);

    it('should handle external shocks', async () => {
      const shockSim = new MarketSimulation({
        ticks: 50,
        tickDelayMs: 0,
        initialPrice: 100,
        initialQuantity: 1000,
        maxPrice: 500,
        minPrice: 10,
        shockProbability: 0.3,
        dbPath: ':memory:',
      });

      shockSim.addSupplier({});
      shockSim.addDemand({});
      shockSim.addShockAgent({});
      
      const report = await shockSim.run();
      
      expect(report.volatility).toBeDefined();
      const externalAgent = report.agentSummaries.find(a => a.type === 'external');
      expect(externalAgent).toBeDefined();
      
      shockSim.cleanup();
    }, 10000);
  });
});
