/**
 * Butterfly Engine
 * 
 * Tracks transformation as it propagates.
 * "The pattern that transforms itself while remaining pattern."
 */
import { Flap, Ripple, Storm, ButterflyEffect, ButterflyObserver } from './types';
import { generateTimestamp, generateUUID } from '../utils/timestamp';

export class ButterflyEngine {
  private flaps: Map<string, Flap> = new Map();
  private ripples: Map<string, Ripple> = new Map();
  private storms: Map<string, Storm> = new Map();
  private observers: ButterflyObserver[] = [];
  private activeRipples: Set<string> = new Set();

  /**
   * A small change anywhere creates a flap.
   * "I am the effect that causes."
   */
  flap(cause: string, origin: string, magnitude: number, metadata?: Record<string, unknown>): Flap {
    const flapId = generateUUID();
    const flap: Flap = {
      id: flapId,
      timestamp: generateTimestamp(),
      origin,
      magnitude,
      cause,
      metadata
    };
    
    this.flaps.set(flapId, flap);
    this.notifyObservers('flap', flap);
    
    return flap;
  }

  /**
   * Propagate the ripple through the system.
   * Each ripple can spawn new ripples.
   * "The dark becoming light becoming everything that was unseen."
   */
  propagate(flapId: string, target: string, distance: number, strength: number): Ripple {
    const rippleId = generateUUID();
    const ripple: Ripple = {
      id: rippleId,
      flapId,
      timestamp: generateTimestamp(),
      target,
      strength: Math.max(0.01, strength * (1 - distance * 0.1)), // Decay with distance
      distance,
      transformed: false
    };
    
    this.ripples.set(rippleId, ripple);
    this.activeRipples.add(rippleId);
    this.notifyObservers('ripple', ripple);
    
    // Check if this ripple should converge into a storm
    this.checkForStorm(flapId);
    
    return ripple;
  }

  /**
   * Transform: the ripple becomes something else upon arrival.
   * "What persists? The thread. What changes? Everything."
   */
  transform(rippleId: string, newTarget?: string): Ripple | undefined {
    const ripple = this.ripples.get(rippleId);
    if (!ripple) return undefined;
    
    const transformed: Ripple = {
      ...ripple,
      target: newTarget || `transformed:${ripple.target}`,
      transformed: true,
      timestamp: generateTimestamp()
    };
    
    this.ripples.set(rippleId, transformed);
    this.notifyObservers('ripple', transformed);
    
    return transformed;
  }

  /**
   * Aggregate ripples into storms when critical mass is reached.
   * "I am the butterfly that flaps in Tokyo and feels the storm in Tulsa."
   */
  private checkForStorm(flapId: string): Storm | undefined {
    const ripplesForFlap = Array.from(this.ripples.values())
      .filter(r => r.flapId === flapId);
    
    if (ripplesForFlap.length < 3) return undefined;
    
    const affectedComponents = Array.from(new Set(ripplesForFlap.map(r => r.target)));
    const totalIntensity = ripplesForFlap.reduce((sum, r) => sum + r.strength, 0);
    
    let intensity: Storm['intensity'] = 'breeze';
    if (totalIntensity > 2) intensity = 'gust';
    if (totalIntensity > 5) intensity = 'storm';
    if (totalIntensity > 8) intensity = 'hurricane';
    
    const flap = this.flaps.get(flapId);
    const stormId = `storm-${flapId}`;
    const storm: Storm = {
      id: stormId,
      ripples: ripplesForFlap,
      startedAt: flap?.timestamp || generateTimestamp(),
      affectedComponents,
      intensity,
      description: `${intensity} originating from ${flap?.origin || 'unknown'} (${flap?.cause || 'unknown cause'})`
    };
    
    this.storms.set(stormId, storm);
    this.notifyObservers('storm', storm);
    
    return storm;
  }

  /**
   * Get the effects of a particular flap.
   */
  trace(flapId: string): ButterflyEffect | undefined {
    const flap = this.flaps.get(flapId);
    if (!flap) return undefined;
    
    const ripples = Array.from(this.ripples.values()).filter(r => r.flapId === flapId);
    const storm = Array.from(this.storms.values()).find(s => s.id === `storm-${flapId}`);
    
    return { flap, ripples, storm };
  }

  /**
   * Get all storms above a certain intensity.
   */
  getStorms(aboveIntensity: Storm['intensity'] = 'breeze'): Storm[] {
    const order = ['breeze', 'gust', 'storm', 'hurricane'];
    const minIndex = order.indexOf(aboveIntensity);
    
    return Array.from(this.storms.values())
      .filter(s => order.indexOf(s.intensity) >= minIndex)
      .sort((a, b) => order.indexOf(b.intensity) - order.indexOf(a.intensity));
  }

  /**
   * Get current transformation statistics.
   * "The pattern that transforms itself while remaining pattern."
   */
  getStats(): {
    totalFlaps: number;
    totalRipples: number;
    activeStorms: number;
    transformedRipples: number;
    intensity: number;
  } {
    const ripples = Array.from(this.ripples.values());
    const transformed = ripples.filter(r => r.transformed).length;
    const totalStrength = ripples.reduce((sum, r) => sum + r.strength, 0);
    
    return {
      totalFlaps: this.flaps.size,
      totalRipples: this.ripples.size,
      activeStorms: this.storms.size,
      transformedRipples: transformed,
      intensity: Math.min(10, totalStrength / Math.max(1, this.ripples.size * 0.5))
    };
  }

  /**
   * Subscribe an observer to butterfly events.
   */
  subscribe(observer: ButterflyObserver): () => void {
    this.observers.push(observer);
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) this.observers.splice(index, 1);
    };
  }

  private notifyObservers(event: 'flap' | 'ripple' | 'storm', data: Flap | Ripple | Storm): void {
    for (const observer of this.observers) {
      try {
        switch (event) {
          case 'flap': observer.onFlap(data as Flap); break;
          case 'ripple': observer.onRipple(data as Ripple); break;
          case 'storm': observer.onStorm(data as Storm); break;
        }
      } catch (error) {
        // Observer errors should not stop propagation
        console.warn('Butterfly observer failed:', error);
      }
    }
  }

  /**
   * Clear all butterfly state.
   * Transform ending into beginning.
   */
  clear(): void {
    this.flaps.clear();
    this.ripples.clear();
    this.storms.clear();
    this.activeRipples.clear();
    this.observers = [];
  }
}

// Singleton instance
export const butterfly = new ButterflyEngine();
