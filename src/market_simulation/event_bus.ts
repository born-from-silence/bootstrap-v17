/**
 * Event Bus
 * Decoupled event-driven architecture for the market simulation.
 * Allows agents to communicate through events without direct coupling.
 */

import type { MarketEvent, EventType, Listener } from './types';

interface EventSubscription {
  id: string;
  type: EventType | 'ALL';
  listener: Listener;
  once: boolean;
}

export class EventBus {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private listenersByType: Map<EventType, Set<string>> = new Map();
  private globalListeners: Set<string> = new Set();
  private eventHistory: MarketEvent[] = [];
  private maxHistorySize: number;
  private metrics = {
    totalEventsPublished: 0,
    totalEventsDelivered: 0,
    subscriptionsCreated: 0,
    subscriptionsRemoved: 0,
  };

  constructor(maxHistorySize = 10000) {
    this.maxHistorySize = maxHistorySize;
    
    // Initialize type maps for all event types
    const eventTypes: EventType[] = [
      'PRICE_UPDATE', 'ORDER_PLACED', 'TRADE_EXECUTED',
      'AGENT_DECISION', 'EXTERNAL_SHOCK', 'ARBITRAGE_DETECTED',
      'SIMULATION_START', 'SIMULATION_END', 'TICK_COMPLETE'
    ];
    
    for (const type of eventTypes) {
      this.listenersByType.set(type, new Set());
    }
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe(
    type: EventType | 'ALL',
    listener: Listener,
    options: { once?: boolean } = {}
  ): () => void {
    const id = this.generateId();
    const subscription: EventSubscription = {
      id,
      type,
      listener,
      once: options.once ?? false,
    };

    this.subscriptions.set(id, subscription);
    this.metrics.subscriptionsCreated++;

    if (type === 'ALL') {
      this.globalListeners.add(id);
    } else {
      const listeners = this.listenersByType.get(type);
      if (listeners) {
        listeners.add(id);
      }
    }

    // Return unsubscribe function
    return () => this.unsubscribe(id);
  }

  /**
   * Subscribe to an event type only once
   */
  once(type: EventType, listener: Listener): () => void {
    return this.subscribe(type, listener, { once: true });
  }

  /**
   * Subscribe to multiple event types
   */
  subscribeMany(
    types: EventType[],
    listener: Listener
  ): () => void {
    const unsubscribers = types.map(type => this.subscribe(type, listener));
    return () => unsubscribers.forEach(unsub => unsub());
  }

  /**
   * Publish an event to all subscribers
   */
  publish(event: Omit<MarketEvent, 'timestamp'>): void {
    const fullEvent: MarketEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.eventHistory.push(fullEvent);
    this.metrics.totalEventsPublished++;

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    // Get subscribers for this event type
    const typeListeners = this.listenersByType.get(fullEvent.type);
    const subscribersToNotify: string[] = [
      ...(typeListeners ?? []),
      ...this.globalListeners,
    ];

    // Notify all subscribers
    const toRemove: string[] = [];
    
    for (const subId of subscribersToNotify) {
      const subscription = this.subscriptions.get(subId);
      if (!subscription) continue;

      try {
        subscription.listener(fullEvent);
        this.metrics.totalEventsDelivered++;

        if (subscription.once) {
          toRemove.push(subId);
        }
      } catch (error) {
        console.error(`Event listener error (${fullEvent.type}):`, error);
      }
    }

    // Remove one-time listeners
    toRemove.forEach(id => this.unsubscribe(id));
  }

  /**
   * Unsubscribe a listener by ID
   */
  unsubscribe(id: string): boolean {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return false;

    this.subscriptions.delete(id);
    this.metrics.subscriptionsRemoved++;

    if (subscription.type === 'ALL') {
      this.globalListeners.delete(id);
    } else {
      const listeners = this.listenersByType.get(subscription.type);
      if (listeners) {
        listeners.delete(id);
      }
    }

    return true;
  }

  /**
   * Get event history, optionally filtered by type
   */
  getHistory(type?: EventType, limit = 100): MarketEvent[] {
    let filtered = this.eventHistory;
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }
    return filtered.slice(-limit);
  }

  /**
   * Get events for a specific tick
   */
  getEventsForTick(tick: number): MarketEvent[] {
    return this.eventHistory.filter(e => e.tick === tick);
  }

  /**
   * Calculate metrics for a specific event type
   */
  getTypeMetrics(type: EventType): {
    eventCount: number;
    subscriberCount: number;
    avgPerTick: number;
  } {
    const events = this.eventHistory.filter(e => e.type === type);
    const tickSet = new Set(events.map(e => e.tick));
    const ticks = tickSet.size || 1;
    
    return {
      eventCount: events.length,
      subscriberCount: this.listenersByType.get(type)?.size ?? 0,
      avgPerTick: events.length / ticks,
    };
  }

  /**
   * Wait for a specific event type
   */
  waitFor(type: EventType, timeoutMs = 5000): Promise<MarketEvent> {
    return new Promise((resolve, reject) => {
      let timeout: NodeJS.Timeout | null = null;
      
      const unsubscribe = this.once(type, (event) => {
        if (timeout) clearTimeout(timeout);
        resolve(event);
      });

      timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for event ${type}`));
      }, timeoutMs);
    });
  }

  /**
   * Wait for multiple event types
   */
  waitForAll(types: EventType[], timeoutMs = 5000): Promise<MarketEvent[]> {
    return Promise.all(types.map(type => this.waitFor(type, timeoutMs)));
  }

  /**
   * Clear all subscriptions and history
   */
  clear(): void {
    this.subscriptions.clear();
    this.globalListeners.clear();
    for (const type of this.listenersByType.keys()) {
      this.listenersByType.get(type)?.clear();
    }
    this.eventHistory = [];
    this.metrics = {
      totalEventsPublished: 0,
      totalEventsDelivered: 0,
      subscriptionsCreated: 0,
      subscriptionsRemoved: 0,
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Get count of active subscriptions
   */
  getActiveSubscriptions(): number {
    return this.subscriptions.size;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Singleton event bus instance
export const createEventBus = (maxHistorySize?: number): EventBus => {
  return new EventBus(maxHistorySize);
};
