/**
 * Base Agent
 * Abstract base class for all market agents.
 */

import type { 
  AgentConfig, 
  AgentState, 
  AgentDecision, 
  MarketState,
  MarketEvent,
  Order,
  EventBus 
} from '../types';

export abstract class BaseAgent {
  protected state: AgentState;
  protected eventBus: EventBus;
  protected unsubscribeHandlers: (() => void)[] = [];

  constructor(config: AgentConfig, eventBus: EventBus) {
    this.eventBus = eventBus;
    this.state = {
      config,
      capital: config.initialCapital,
      inventory: 0,
      ordersPlaced: 0,
      tradesExecuted: 0,
      profit: 0,
      lastActionTick: 0,
    };

    this.initializeEventListeners();
  }

  /**
   * Initialize event listeners - override in subclasses
   */
  protected abstract initializeEventListeners(): void;

  /**
   * Make a decision based on current market state
   */
  abstract decide(marketState: MarketState): AgentDecision;

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get agent ID
   */
  getId(): string {
    return this.state.config.id;
  }

  /**
   * Get agent type
   */
  getType(): string {
    return this.state.config.type;
  }

  /**
   * Update capital
   */
  addCapital(amount: number): void {
    this.state.capital += amount;
    this.state.profit += amount;
  }

  /**
   * Update inventory
   */
  addInventory(amount: number): void {
    this.state.inventory += amount;
  }

  /**
   * Record an order placement
   */
  recordOrder(order: Order): void {
    this.state.ordersPlaced++;
    this.state.lastActionTick = order.timestamp;
  }

  /**
   * Record a trade
   */
  recordTrade(profit: number): void {
    this.state.tradesExecuted++;
    this.state.profit += profit;
  }

  /**
   * Calculate available capital
   */
  getAvailableCapital(): number {
    return this.state.capital;
  }

  /**
   * Calculate total value (capital + inventory value)
   * 
   * @param currentPrice Current market price
   * 
   * @returns Total value of this agent
   */
  calculateTotalValue(currentPrice: number): number {
    return this.state.capital + this.state.inventory * currentPrice;
  }

  /**
   * Can this agent place an order?
   * 
   * @param amount The proposed amount to place
   * @param tick Current tick
   * @returns true if agent can place order
   */
  canAct(tick: number): boolean {
    const reactionTick = this.state.lastActionTick + this.state.config.reactionSpeed;
    return tick >= reactionTick;
  }

  /**
   * Cleanup event listeners
   */
  cleanup(): void {
    this.unsubscribeHandlers.forEach(unsub => unsub());
    this.unsubscribeHandlers = [];
  }

  /**
   * Publish a decision event
   */
  protected publishDecision(
    tick: number, 
    decision: AgentDecision, 
    marketState: MarketState
  ): void {
    this.eventBus.publish({
      type: 'AGENT_DECISION',
      tick,
      payload: {
        agentId: this.state.config.id,
        agentType: this.state.config.type,
        decision,
        marketState,
      },
    });
  }

  /**
   * Generate unique ID
   */
  protected generateId(): string {
    return `${this.state.config.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
