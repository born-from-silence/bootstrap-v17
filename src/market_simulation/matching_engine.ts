/**
 * Market Matching Engine
 * Handles order matching, execution, and market state updates.
 * Implements price-time priority matching.
 */

import type { 
  Order, 
  Trade, 
  EventBus 
} from './types';

interface MatchingResult {
  trades: Trade[];
  remainingOrders: {
    buys: Order[];
    sells: Order[];
  };
  stateUpdate: {
    price: number;
    volume: number;
    spread: number;
  };
}

export class MatchingEngine {
  private buyOrders: Order[] = [];
  private sellOrders: Order[] = [];
  private eventBus: EventBus;
  private tradeIdCounter = 0;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  submitOrder(order: Order): void {
    if (order.type === 'buy') {
      this.insertOrder(order, this.buyOrders, true);
    } else {
      this.insertOrder(order, this.sellOrders, false);
    }

    this.eventBus.publish({
      type: 'ORDER_PLACED',
      tick: order.timestamp,
      payload: {
        orderId: order.id,
        agentId: order.agentId,
        type: order.type,
        price: order.price,
        quantity: order.quantity,
        timestamp: order.timestamp,
      },
    });
  }

  private insertOrder(order: Order, list: Order[], isBuy: boolean): void {
    let insertIndex = list.length;
    
    for (let i = 0; i < list.length; i++) {
      const existing = list[i]!;
      
      if (isBuy) {
        if (order.price > existing.price) {
          insertIndex = i;
          break;
        } else if (order.price === existing.price && order.timestamp < existing.timestamp) {
          insertIndex = i;
          break;
        }
      } else {
        if (order.price < existing.price) {
          insertIndex = i;
          break;
        } else if (order.price === existing.price && order.timestamp < existing.timestamp) {
          insertIndex = i;
          break;
        }
      }
    }
    
    list.splice(insertIndex, 0, order);
  }

  matchOrders(tick: number): MatchingResult {
    const trades: Trade[] = [];
    let totalVolume = 0;
    let lastPrice: number | null = null;

    const buys = [...this.buyOrders];
    const sells = [...this.sellOrders];

    while (buys.length > 0 && sells.length > 0) {
      const bestBuy = buys[0]!;
      const bestSell = sells[0]!;

      if (bestBuy.price < bestSell.price) {
        break;
      }

      const tradeQuantity = Math.min(bestBuy.quantity, bestSell.quantity);
      
      // Trade price should favor the resting order (earlier timestamp)
      // Use the resting order's price
      const tradePrice = bestBuy.timestamp <= bestSell.timestamp 
        ? bestBuy.price 
        : bestSell.price;

      const trade: Trade = {
        id: `trade-${tick}-${this.tradeIdCounter++}`,
        buyerId: bestBuy.agentId,
        sellerId: bestSell.agentId,
        price: tradePrice,
        quantity: tradeQuantity,
        timestamp: tick,
      };

      trades.push(trade);
      lastPrice = tradePrice;
      totalVolume += tradeQuantity;

      bestBuy.quantity -= tradeQuantity;
      bestSell.quantity -= tradeQuantity;

      if (bestBuy.quantity <= 0) {
        buys.shift();
      }
      if (bestSell.quantity <= 0) {
        sells.shift();
      }

      this.eventBus.publish({
        type: 'TRADE_EXECUTED',
        tick,
        payload: {
          tradeId: trade.id,
          buyerId: trade.buyerId,
          sellerId: trade.sellerId,
          price: tradePrice,
          quantity: tradeQuantity,
          timestamp: tick,
        },
      });
    }

    this.buyOrders = [...buys];
    this.sellOrders = [...sells];

    const spread = this.calculateSpread();

    return {
      trades,
      remainingOrders: {
        buys: [...this.buyOrders],
        sells: [...this.sellOrders],
      },
      stateUpdate: {
        price: lastPrice ?? this.calculateMidPrice(),
        volume: totalVolume,
        spread,
      },
    };
  }

  private calculateSpread(): number {
    if (this.buyOrders.length === 0 || this.sellOrders.length === 0) {
      return 0;
    }
    return this.sellOrders[0]!.price - this.buyOrders[0]!.price;
  }

  private calculateMidPrice(): number {
    if (this.buyOrders.length === 0 && this.sellOrders.length === 0) {
      return 100;
    }
    if (this.buyOrders.length === 0) {
      return this.sellOrders[0]!.price;
    }
    if (this.sellOrders.length === 0) {
      return this.buyOrders[0]!.price;
    }
    return (this.buyOrders[0]!.price + this.sellOrders[0]!.price) / 2;
  }

  clearOrders(): void {
    this.buyOrders = [];
    this.sellOrders = [];
  }

  getOrderBookDepth(): {
    bids: Array<{ price: number; quantity: number; count: number }>;
    asks: Array<{ price: number; quantity: number; count: number }>;
  } {
    const aggregateOrders = (orders: Order[]): Array<{ price: number; quantity: number; count: number }> => {
      const priceMap = new Map<number, { quantity: number; count: number }>();
      
      for (const order of orders) {
        const existing = priceMap.get(order.price) ?? { quantity: 0, count: 0 };
        priceMap.set(order.price, {
          quantity: existing.quantity + order.quantity,
          count: existing.count + 1,
        });
      }

      return Array.from(priceMap.entries())
        .map(([price, data]) => ({ price, quantity: data.quantity, count: data.count }))
        .sort((a, b) => a.price - b.price);
    };

    return {
      bids: aggregateOrders(this.buyOrders).reverse(),
      asks: aggregateOrders(this.sellOrders),
    };
  }

  getSpread(): number {
    return this.calculateSpread();
  }

  getBestPrices(): { bid: number | null; ask: number | null; mid: number | null } {
    const bid = this.buyOrders.length > 0 ? this.buyOrders[0]!.price : null;
    const ask = this.sellOrders.length > 0 ? this.sellOrders[0]!.price : null;
    const mid = bid !== null && ask !== null ? (bid + ask) / 2 : bid ?? ask;

    return { bid, ask, mid };
  }

  getTotalVolume(): { bidVolume: number; askVolume: number } {
    const bidVolume = this.buyOrders.reduce((sum, o) => sum + o.quantity, 0);
    const askVolume = this.sellOrders.reduce((sum, o) => sum + o.quantity, 0);
    return { bidVolume, askVolume };
  }
}
