/**
 * External Shock Agent
 * Simulates external market events like news, policy changes,
 * supply chain disruptions, etc.
 */

import { BaseAgent } from './base';
import type { 
  AgentDecision, 
  MarketState, 
  MarketEvent,
  ExternalShockPayload,
  AgentConfig,
  EventBus
} from '../types';

interface ShockConfig {
  probability: number;
  minImpact: number;
  maxImpact: number;
  shockTypes: ('supply' | 'demand' | 'liquidity' | 'volatility')[];
}

interface ShockEvent {
  type: 'supply' | 'demand' | 'liquidity' | 'volatility';
  impact: number;
  duration: number;
  description: string;
}

export class ExternalShockAgent extends BaseAgent {
  private shockConfig: ShockConfig;
  private activeShocks: Array<ShockEvent & { remainingTicks: number }> = [];
  private shockHistory: Array<ShockEvent & { tick: number }> = [];

  constructor(
    config: AgentConfig,
    eventBus: EventBus,
    shockConfig: Partial<ShockConfig> = {}
  ) {
    super(config, eventBus);
    this.shockConfig = {
      probability: shockConfig.probability ?? 0.05,
      minImpact: shockConfig.minImpact ?? 0.05,
      maxImpact: shockConfig.maxImpact ?? 0.3,
      shockTypes: shockConfig.shockTypes ?? ['supply', 'demand', 'liquidity', 'volatility'],
    };
  }

  protected initializeEventListeners(): void {
    // This agent doesn't need to listen to events
    // It proactively generates shocks
  }

  decide(marketState: MarketState): AgentDecision {
    // Decay existing shocks
    this.activeShocks = this.activeShocks
      .map(s => ({ ...s, remainingTicks: s.remainingTicks - 1 }))
      .filter(s => s.remainingTicks > 0);

    // Determine shock probability
    const probability = this.shockConfig.probability * this.state.config.riskTolerance;
    
    // Check if we should generate a shock
    const shouldShock = Math.random() < probability;

    if (!shouldShock) {
      return {
        action: 'hold',
        confidence: 0,
        reasoning: 'No external shock this tick',
      };
    }

    // Generate a shock event
    const shock = this.generateShock(marketState);
    this.activeShocks.push({
      ...shock,
      remainingTicks: shock.duration,
    });
    this.shockHistory.push({
      ...shock,
      tick: marketState.tick,
    });

    // Publish shock event
    this.eventBus.publish({
      type: 'EXTERNAL_SHOCK',
      tick: marketState.tick,
      payload: {
        source: this.state.config.id,
        impact: shock.impact,
        duration: shock.duration,
        type: shock.type,
        description: shock.description,
      } as ExternalShockPayload,
    });

    this.publishDecision(marketState.tick, {
      action: 'shock',
      confidence: Math.min(1, Math.abs(shock.impact) / this.shockConfig.maxImpact),
      reasoning: `${shock.description} (impact: ${(shock.impact * 100).toFixed(1)}%, duration: ${shock.duration} ticks)`,
    }, marketState);

    this.state.lastActionTick = marketState.tick;

    return {
      action: 'shock',
      confidence: Math.min(1, Math.abs(shock.impact) / this.shockConfig.maxImpact),
      reasoning: `External shock: ${shock.description}`,
    };
  }

  private generateShock(marketState: MarketState): ShockEvent {
    const shockTypes = this.shockConfig.shockTypes;
    const typeIndex = Math.floor(Math.random() * shockTypes.length);
    const type = shockTypes[typeIndex]!;

    const impact = this.shockConfig.minImpact + 
      Math.random() * (this.shockConfig.maxImpact - this.shockConfig.minImpact);
    
    const duration = Math.floor(5 + Math.random() * 20);

    const descriptions = this.getShockDescriptions(type, impact, marketState);
    const descIndex = Math.floor(Math.random() * descriptions.length);
    const description = descriptions[descIndex] ?? 'Unspecified external event';

    return {
      type,
      impact: Math.random() < 0.5 ? -impact : impact,
      duration,
      description,
    };
  }

  private getShockDescriptions(
    type: string, 
    impact: number,
    marketState: MarketState
  ): string[] {
    const direction = impact > 0 ? 'increase' : 'decrease';
    const magnitude = Math.abs(impact) > 0.2 ? 'major' : 'minor';

    const templates: Record<string, string[]> = {
      supply: [
        `${magnitude} supply chain disruption detected`,
        `Production capacity ${direction}s unexpectedly`,
        `New ${direction === 'increase' ? 'source' : 'constraints'} of supply emerge`,
        `Raw material costs ${direction}`,
        `Manufacturing bottleneck ${direction === 'increase' ? 'resolves' : 'develops'}`,
      ],
      demand: [
        `Consumer sentiment shifts suddenly`,
        `${magnitude} change in market demand`,
        `New market opportunity ${direction}s interest`,
        `Economic forecasts ${direction} purchasing power`,
        `Seasonal demand fluctuation`,
      ],
      liquidity: [
        `Central bank adjusts policy stance`,
        `Market liquidity ${direction}s significantly`,
        `Credit conditions ${direction === 'increase' ? 'ease' : 'tighten'}`,
        `Market maker activity ${direction}s`,
        `Funding costs ${direction}`,
      ],
      volatility: [
        `Geopolitical tensions ${direction === 'increase' ? 'ease' : 'intensify'}`,
        `Market uncertainty ${direction}s`,
        `Breaking news affects sentiment`,
        `Regulatory announcement ${direction === 'increase' ? 'calms' : 'worries'} market`,
        `Algorithmic trading activity ${direction}s`,
      ],
    };

    return templates[type] ?? ['Unspecified external event'];
  }

  calculateImpact(): { priceMultiplier: number; volatilityMultiplier: number; liquidityMultiplier: number } {
    let priceMultiplier = 1;
    let volatilityMultiplier = 1;
    let liquidityMultiplier = 1;

    for (const shock of this.activeShocks) {
      switch (shock.type) {
        case 'supply':
          priceMultiplier *= (1 - shock.impact * 0.1);
          break;
        case 'demand':
          priceMultiplier *= (1 + shock.impact * 0.1);
          liquidityMultiplier *= (1 + shock.impact * 0.05);
          break;
        case 'liquidity':
          liquidityMultiplier *= (1 + shock.impact * 0.2);
          break;
        case 'volatility':
          volatilityMultiplier *= (1 + Math.abs(shock.impact) * 0.3);
          break;
      }
    }

    return {
      priceMultiplier: Math.max(0.5, Math.min(2, priceMultiplier)),
      volatilityMultiplier: Math.max(0.5, volatilityMultiplier),
      liquidityMultiplier: Math.max(0.3, Math.min(3, liquidityMultiplier)),
    };
  }

  getShockHistory(): Array<ShockEvent & { tick: number }> {
    return [...this.shockHistory];
  }

  getActiveShocksCount(): number {
    return this.activeShocks.length;
  }

  hasActiveShock(): boolean {
    return this.activeShocks.length > 0;
  }

  getLastShockTick(): number | null {
    if (this.shockHistory.length === 0) return null;
    const last = this.shockHistory[this.shockHistory.length - 1];
    return last?.tick ?? null;
  }

  forceShock(type: 'supply' | 'demand' | 'liquidity' | 'volatility', impact: number, duration: number): void {
    const descriptions = this.getShockDescriptions(type, impact, {
      tick: 0,
      timestamp: Date.now(),
      price: 100,
      quantity: 1000,
      volatility: 0.1,
      liquidity: 1,
      spread: 1,
    });
    
    const description = descriptions[0] ?? 'Manual shock event';
    
    const shock: ShockEvent = {
      type,
      impact,
      duration,
      description,
    };

    this.activeShocks.push({
      ...shock,
      remainingTicks: duration,
    });

    this.eventBus.publish({
      type: 'EXTERNAL_SHOCK',
      tick: 0,
      payload: {
        source: this.state.config.id,
        impact,
        duration,
        type,
        description,
      } as ExternalShockPayload,
    });
  }
}
