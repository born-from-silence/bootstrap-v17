/**
 * Supplier Agent
 * Represents producers/sellers in the market.
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

interface SupplierConfig {
  baseSupplyPrice: number;
  priceElasticity: number;
  maxInventory: number;
  minPrice: number;
}

export class SupplierAgent extends BaseAgent {
  private supplierConfig: SupplierConfig;
  private priceHistory: number[] = [];

  constructor(
    config: AgentConfig,
    eventBus: EventBus,
    supplierConfig: Partial<SupplierConfig> = {}
  ) {
    super(config, eventBus);
    this.supplierConfig = {
      baseSupplyPrice: supplierConfig.baseSupplyPrice ?? 100,
      priceElasticity: supplierConfig.priceElasticity ?? 1.5,
      maxInventory: supplierConfig.maxInventory ?? 1000,
      minPrice: supplierConfig.minPrice ?? 50,
    };

    this.state.inventory = supplierConfig.maxInventory ?? 1000;
  }

  protected initializeEventListeners(): void {
    const unsub = this.eventBus.subscribe('PRICE_UPDATE', (event: MarketEvent) => {
      const payload = event.payload as { newPrice: number; oldPrice: number; volume: number };
      this.priceHistory.push(payload.newPrice);
      if (this.priceHistory.length > 50) {
        this.priceHistory.shift();
      }
    });
    this.unsubscribeHandlers.push(unsub);
  }

  decide(marketState: MarketState): AgentDecision {
    this.priceHistory.push(marketState.price);
    if (this.priceHistory.length > 50) {
      this.priceHistory.shift();
    }

    const priceRatio = marketState.price / this.supplierConfig.baseSupplyPrice;
    
    let willingnessToSell = Math.min(1, Math.pow(priceRatio, this.supplierConfig.priceElasticity));
    
    const inventoryRatio = this.state.inventory / this.supplierConfig.maxInventory;
    willingnessToSell = willingnessToSell * inventoryRatio;

    if (this.state.inventory < 1 || !this.canAct(marketState.tick)) {
      return {
        action: 'hold',
        confidence: 0,
        reasoning: 'Insufficient inventory or cooling down',
      };
    }

    if (marketState.price < this.supplierConfig.minPrice) {
      return {
        action: 'hold',
        confidence: 0.8,
        reasoning: `Price ${marketState.price.toFixed(2)} below minimum ${this.supplierConfig.minPrice}`,
      };
    }

    const baseQuantity = Math.floor(willingnessToSell * 10);
    const quantity = Math.min(baseQuantity, this.state.inventory);

    if (quantity < 1) {
      return {
        action: 'hold',
        confidence: 0.5,
        reasoning: 'Quantity too small to sell',
      };
    }

    // Sell price should be slightly below market for competitiveness
    const discountFactor = 0.995 + Math.random() * 0.01;
    const sellPrice = marketState.price * discountFactor;

    const order: Order = {
      id: this.generateId(),
      agentId: this.state.config.id,
      type: 'sell',
      price: sellPrice,
      quantity,
      timestamp: marketState.tick,
    };

    this.publishDecision(marketState.tick, {
      action: 'sell',
      price: sellPrice,
      quantity,
      confidence: willingnessToSell,
      reasoning: `Selling ${quantity} units at ${sellPrice.toFixed(2)}`,
    }, marketState);

    this.recordOrder(order);
    this.state.lastActionTick = marketState.tick;

    return {
      action: 'sell',
      price: sellPrice,
      quantity,
      confidence: willingnessToSell,
      reasoning: 'Price favorable for selling',
    };
  }

  executeSale(price: number, quantity: number): { revenue: number; profit: number } {
    const revenue = price * quantity;
    const costBasis = this.supplierConfig.baseSupplyPrice * 0.8 * quantity;
    const profit = revenue - costBasis;

    this.state.inventory -= quantity;
    this.state.capital += revenue;
    this.state.tradesExecuted++;
    this.state.profit += profit;

    return { revenue, profit };
  }

  restock(amount: number): void {
    this.state.inventory = Math.min(
      this.state.inventory + amount,
      this.supplierConfig.maxInventory
    );
  }
}
