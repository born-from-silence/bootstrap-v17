/**
 * Demand Agent
 * Represents consumers/buyers in the market.
 * Responds to price changes by adjusting demand.
 * Lower prices = more willing to buy (demand curve).
 */

import { BaseAgent } from './base';
import type { 
  AgentDecision, 
  MarketState, 
  MarketEvent,
  Order,
  AgentConfig,
  EventBus
} from '../types';

interface DemandConfig {
  baseDemandPrice: number;
  priceElasticity: number;
  maxBudget: number;
  maxPrice: number;
}

export class DemandAgent extends BaseAgent {
  private demandConfig: DemandConfig;
  private satisfaction: number = 50; // 0-100 satisfaction level
  private priceHistory: number[] = [];

  constructor(
    config: AgentConfig,
    eventBus: EventBus,
    demandConfig: Partial<DemandConfig> = {}
  ) {
    super(config, eventBus);
    this.demandConfig = {
      baseDemandPrice: demandConfig.baseDemandPrice ?? 100,
      priceElasticity: demandConfig.priceElasticity ?? 1.0,
      maxBudget: demandConfig.maxBudget ?? 10000,
      maxPrice: demandConfig.maxPrice ?? 150,
    };
  }

  protected initializeEventListeners(): void {
    // Listen for trades to gauge satisfaction
    const unsub = this.eventBus.subscribe('TRADE_EXECUTED', (event: MarketEvent) => {
      const payload = event.payload as { 
        buyerId: string; 
        sellerId: string;
        price: number;
        quantity: number;
      };
      
      // Increase satisfaction if we participated in a trade
      if (payload.buyerId === this.state.config.id) {
        this.satisfaction = Math.min(100, this.satisfaction + 5);
      }
    });
    this.unsubscribeHandlers.push(unsub);
  }

  decide(marketState: MarketState): AgentDecision {
    // Update price history
    this.priceHistory.push(marketState.price);
    if (this.priceHistory.length > 50) {
      this.priceHistory.shift();
    }

    // Calculate price trend
    let trend = 0;
    if (this.priceHistory.length >= 10) {
      const recent = this.priceHistory.slice(-10);
      trend = ((recent[recent.length - 1] ?? 0) - (recent[0] ?? 0)) / (recent[0] ?? 1);
    }

    // If price is trending down, increase urgency to buy
    const trendMultiplier = trend < -0.05 ? 1.2 : trend > 0.05 ? 0.8 : 1.0;

    // Calculate willingness to buy based on price
    const priceRatio = marketState.price / this.demandConfig.baseDemandPrice;
    
    // Demand curve: lower prices = more willing to buy
    let willingnessToBuy = Math.min(1, Math.pow(1 / Math.max(0.1, priceRatio), this.demandConfig.priceElasticity));
    
    // Adjust for trend
    willingnessToBuy *= trendMultiplier;

    // Adjust for satisfaction (lower satisfaction = higher willingness)
    const satisfactionFactor = 1 - (this.satisfaction / 100);
    willingnessToBuy *= (0.5 + 0.5 * satisfactionFactor);

    // Apply risk tolerance
    willingnessToBuy *= this.state.config.riskTolerance;

    // Check constraints
    if (!this.canAct(marketState.tick)) {
      return {
        action: 'hold',
        confidence: 0,
        reasoning: 'Cooling down between actions',
      };
    }

    if (marketState.price > this.demandConfig.maxPrice) {
      return {
        action: 'hold',
        confidence: 0.9,
        reasoning: `Price ${marketState.price.toFixed(2)} exceeds max budget ${this.demandConfig.maxPrice}`,
      };
    }

    // Calculate quantity to buy
    const maxAffordable = Math.floor(this.state.capital / marketState.price);
    const baseQuantity = Math.max(1, Math.floor(willingnessToBuy * 8));
    const quantity = Math.min(baseQuantity, maxAffordable);

    if (quantity < 1) {
      return {
        action: 'hold',
        confidence: 0.5,
        reasoning: 'Insufficient capital to buy',
      };
    }

    // Calculate bid price (slightly above market for competitiveness)
    const urgencyFactor = 1 + (satisfactionFactor * 0.02); // More urgent = willing to pay more
    const bidPrice = marketState.price * urgencyFactor;

    // Check budget
    if (bidPrice * quantity > this.state.capital) {
      return {
        action: 'hold',
        confidence: 0.7,
        reasoning: 'Insufficient budget for desired quantity',
      };
    }

    // Create order
    const order: Order = {
      id: this.generateId(),
      agentId: this.state.config.id,
      type: 'buy',
      price: bidPrice,
      quantity,
      timestamp: marketState.tick,
    };

    this.publishDecision(marketState.tick, {
      action: 'buy',
      price: bidPrice,
      quantity,
      confidence: willingnessToBuy,
      reasoning: `Buying ${quantity} units at ${bidPrice.toFixed(2)} (willingness: ${(willingnessToBuy * 100).toFixed(1)}%)`,
    }, marketState);

    this.recordOrder(order);
    this.state.lastActionTick = marketState.tick;

    return {
      action: 'buy',
      price: bidPrice,
      quantity,
      confidence: willingnessToBuy,
      reasoning: 'Price favorable for buying',
    };
  }

  /**
   * Execute a purchase
   */
  executePurchase(price: number, quantity: number): { cost: number; satisfactionGain: number } {
    const cost = price * quantity;
    const satisfactionGain = Math.min(20, quantity * 2);

    // Update state
    this.state.capital -= cost;
    this.state.inventory += quantity;
    this.state.tradesExecuted++;
    this.satisfaction = Math.min(100, this.satisfaction + satisfactionGain);

    return { cost, satisfactionGain };
  }

  /**
   * Decay satisfaction over time
   */
  decaySatisfaction(amount: number): void {
    this.satisfaction = Math.max(0, this.satisfaction - amount);
  }

  /**
   * Get current satisfaction level
   */
  getSatisfaction(): number {
    return this.satisfaction;
  }
}
