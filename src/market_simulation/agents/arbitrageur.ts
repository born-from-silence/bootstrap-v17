/**
 * Arbitrageur Agent
 * Detects price discrepancies and exploits them.
 * Profits from market inefficiencies.
 */

import { BaseAgent } from './base';
import type { 
  AgentDecision, 
  MarketState, 
  MarketEvent,
  ArbitragePayload,
  Order,
  AgentConfig,
  EventBus
} from '../types';

interface ArbitrageConfig {
  threshold: number; // Minimum price discrepancy to trigger action
  maxPosition: number;
  holdingPeriod: number; // Ticks to hold before selling
}

interface PriceObservation {
  price: number;
  tick: number;
  source: string;
}

export class ArbitrageurAgent extends BaseAgent {
  private arbConfig: ArbitrageConfig;
  private priceHistory: Map<string, PriceObservation> = new Map();
  private positions: Array<{
    buyPrice: number;
    quantity: number;
    entryTick: number;
  }> = [];
  private opportunities: Array<{
    discrepancy: number;
    tick: number;
    action: 'buy' | 'sell';
  }> = [];

  constructor(
    config: AgentConfig,
    eventBus: EventBus,
    arbConfig: Partial<ArbitrageConfig> = {}
  ) {
    super(config, eventBus);
    this.arbConfig = {
      threshold: arbConfig.threshold ?? 0.02, // 2% threshold
      maxPosition: arbConfig.maxPosition ?? 100,
      holdingPeriod: arbConfig.holdingPeriod ?? 10,
    };
  }

  protected initializeEventListeners(): void {
    // Listen for price updates to track across "markets" (simulated)
    const unsub = this.eventBus.subscribe('PRICE_UPDATE', (event: MarketEvent) => {
      const payload = event.payload as { newPrice: number; oldPrice: number };
      
      // Store price observation with tick as part of "market"
      this.priceHistory.set(`market_${event.tick % 3}`, {
        price: payload.newPrice,
        tick: event.tick,
        source: 'primary',
      });

      // Clean old observations
      for (const [key, obs] of this.priceHistory) {
        if (event.tick - obs.tick > 50) {
          this.priceHistory.delete(key);
        }
      }
    });
    this.unsubscribeHandlers.push(unsub);

    // Track arbitrage opportunities
    const arbUnsub = this.eventBus.subscribe('ARBITRAGE_DETECTED', (event: MarketEvent) => {
      const payload = event.payload as ArbitragePayload;
      if (payload.arbitrageurId === this.state.config.id) {
        this.opportunities.push({
          discrepancy: payload.priceDiscrepancy,
          tick: event.tick,
          action: payload.opportunitySize > 0 ? 'buy' : 'sell',
        });
      }
    });
    this.unsubscribeHandlers.push(arbUnsub);
  }

  decide(marketState: MarketState): AgentDecision {
    // Check for held positions to exit
    const positionsToExit = this.positions.filter(
      pos => marketState.tick - pos.entryTick >= this.arbConfig.holdingPeriod
    );

    if (positionsToExit.length > 0) {
      const totalQuantity = positionsToExit.reduce((sum, pos) => sum + pos.quantity, 0);
      const avgBuyPrice = positionsToExit.reduce((sum, pos) => sum + pos.buyPrice * pos.quantity, 0) / totalQuantity;
      const potentialProfit = (marketState.price - avgBuyPrice) * totalQuantity;

      // Exit position
      const order: Order = {
        id: this.generateId(),
        agentId: this.state.config.id,
        type: 'sell',
        price: marketState.price * 0.998, // Slight discount to exit
        quantity: totalQuantity,
        timestamp: marketState.tick,
      };

      // Remove exited positions
      this.positions = this.positions.filter(pos => !positionsToExit.includes(pos));

      this.recordOrder(order);
      this.state.lastActionTick = marketState.tick;

      return {
        action: 'sell',
        price: order.price,
        quantity: totalQuantity,
        confidence: potentialProfit > 0 ? 0.9 : 0.5,
        reasoning: `Exiting positions with ${potentialProfit > 0 ? 'positive' : 'negative'} profit: ${potentialProfit.toFixed(2)}`,
      };
    }

    // Look for arbitrage opportunities
    const opportunity = this.detectArbitrage(marketState);
    
    if (!opportunity || opportunity.discrepancy < this.arbConfig.threshold) {
      return {
        action: 'hold',
        confidence: 0,
        reasoning: 'No significant arbitrage opportunities detected',
      };
    }

    // Check if we can act
    if (!this.canAct(marketState.tick)) {
      return {
        action: 'hold',
        confidence: 0,
        reasoning: 'Cooling down',
      };
    }

    // Calculate position size based on confidence
    const confidence = Math.min(1, opportunity.discrepancy / (this.arbConfig.threshold * 2));
    const positionSize = Math.min(
      Math.floor(confidence * this.arbConfig.maxPosition),
      Math.floor(this.state.capital / opportunity.buyPrice)
    );

    if (positionSize < 1) {
      return {
        action: 'hold',
        confidence: 0.3,
        reasoning: 'Position size too small',
      };
    }

    // Publish arbitrage event
    this.eventBus.publish({
      type: 'ARBITRAGE_DETECTED',
      tick: marketState.tick,
      payload: {
        arbitrageurId: this.state.config.id,
        priceDiscrepancy: opportunity.discrepancy,
        opportunitySize: positionSize * (opportunity.sellPrice - opportunity.buyPrice),
        markets: ['primary', 'opportunity'],
      } as ArbitragePayload,
    });

    // Create buy order at lower price
    const order: Order = {
      id: this.generateId(),
      agentId: this.state.config.id,
      type: 'buy',
      price: opportunity.buyPrice,
      quantity: positionSize,
      timestamp: marketState.tick,
    };

    // Record position
    this.positions.push({
      buyPrice: opportunity.buyPrice,
      quantity: positionSize,
      entryTick: marketState.tick,
    });

    this.publishDecision(marketState.tick, {
      action: 'buy',
      price: opportunity.buyPrice,
      quantity: positionSize,
      confidence,
      reasoning: `Arbitrage: buy at ${opportunity.buyPrice.toFixed(2)}, expect to sell at ${opportunity.sellPrice.toFixed(2)} (discrepancy: ${(opportunity.discrepancy * 100).toFixed(2)}%)`,
    }, marketState);

    this.recordOrder(order);
    this.state.lastActionTick = marketState.tick;

    return {
      action: 'buy',
      price: opportunity.buyPrice,
      quantity: positionSize,
      confidence,
      reasoning: 'Arbitrage opportunity detected',
    };
  }

  /**
   * Detect arbitrage opportunities by analyzing price history
   * and current market conditions
   */
  private detectArbitrage(marketState: MarketState): {
    discrepancy: number;
    buyPrice: number;
    sellPrice: number;
  } | null {
    if (this.priceHistory.size < 2) return null;

    // Calculate average observed price
    let sumPrices = marketState.price;
    let count = 1;
    
    for (const obs of this.priceHistory.values()) {
      sumPrices += obs.price;
      count++;
    }
    
    const avgPrice = sumPrices / count;
    const currentSpread = marketState.spread;

    // Check if there's a discrepancy
    const priceDiscrepancy = Math.abs(marketState.price - avgPrice) / avgPrice;

    if (priceDiscrepancy > this.arbConfig.threshold) {
      const isCheap = marketState.price < avgPrice;
      const buyPrice = isCheap 
        ? marketState.price 
        : marketState.price - currentSpread;
      const sellPrice = isCheap 
        ? avgPrice 
        : marketState.price;

      return {
        discrepancy: priceDiscrepancy,
        buyPrice,
        sellPrice,
      };
    }

    // Check volatility for opportunities
    if (marketState.volatility > 0.05 && this.state.config.riskTolerance > 0.7) {
      // High volatility + high risk tolerance = expect mean reversion
      return {
        discrepancy: marketState.volatility * 0.5,
        buyPrice: marketState.price * 0.99,
        sellPrice: marketState.price * 1.01,
      };
    }

    return null;
  }

  /**
   * Record a profitable trade
   */
  recordArbitrageProfit(buyPrice: number, sellPrice: number, quantity: number): void {
    const profit = (sellPrice - buyPrice) * quantity;
    this.addCapital(profit);
    this.positions = this.positions.filter(pos => pos.buyPrice !== buyPrice);
  }

  /**
   * Get arbitrage statistics
   */
  getStats(): {
    opportunities: number;
    currentPositions: number;
    avgDiscrepancy: number;
  } {
    const avgDisc = this.opportunities.length > 0
      ? this.opportunities.reduce((sum, o) => sum + o.discrepancy, 0) / this.opportunities.length
      : 0;

    return {
      opportunities: this.opportunities.length,
      currentPositions: this.positions.length,
      avgDiscrepancy: avgDisc,
    };
  }
}
