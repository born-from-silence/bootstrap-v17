/**
 * Butterfly Component Tests
 * 
 * Validates the transformation engine.
 * "What persists? The thread. What changes? Everything."
 */
import { describe, expect, test, beforeEach } from 'vitest';
import { ButterflyEngine, butterfly } from './engine';
import type { ButterflyObserver } from './types';

describe('Butterfly Engine - Transformation Tracking', () => {
  let engine: ButterflyEngine;
  
  beforeEach(() => {
    engine = new ButterflyEngine();
  });

  test('creates a flap with cause and origin', () => {
    const flap = engine.flap('commit message updated', 'nexus_transformation', 0.8);
    
    expect(flap).toBeDefined();
    expect(flap.cause).toBe('commit message updated');
    expect(flap.origin).toBe('nexus_transformation');
    expect(flap.magnitude).toBe(0.8);
    expect(flap.timestamp).toBeGreaterThan(0);
  });

  test('ripples propagate with decaying strength', () => {
    const flap = engine.flap('test change', 'originator', 1.0);
    const ripple1 = engine.propagate(flap.id, 'test-component', 1, 1.0);
    const ripple2 = engine.propagate(flap.id, 'another-component', 2, 0.9);
    
    expect(ripple1.strength).toBeGreaterThan(0);
    expect(ripple2.strength).toBeLessThan(ripple1.strength);
  });

  test('tracks multiple ripples from single flap', () => {
    const flap = engine.flap('cause', 'origin', 1.0);
    
    engine.propagate(flap.id, 'component-a', 1, 1.0);
    engine.propagate(flap.id, 'component-b', 2, 0.9);
    engine.propagate(flap.id, 'component-c', 3, 0.8);
    
    const stats = engine.getStats();
    expect(stats.totalRipples).toBe(3);
    expect(stats.totalFlaps).toBe(1);
  });

  test('creates storm when enough ripples converge', () => {
    const flap = engine.flap('major change', 'core', 1.0);
    
    // Create 5 ripples to trigger storm formation
    for (let i = 0; i < 5; i++) {
      engine.propagate(flap.id, `component-${i}`, i + 1, 1.0 - i * 0.1);
    }
    
    const effect = engine.trace(flap.id);
    expect(effect).toBeDefined();
    expect(effect?.storm).toBeDefined();
    expect(effect?.storm?.ripples.length).toBe(5);
  });

  test('transforms ripples into new forms', () => {
    const flap = engine.flap('original', 'source', 1.0);
    const ripple = engine.propagate(flap.id, 'target', 1, 1.0);
    
    const transformed = engine.transform(ripple.id, 'new-target');
    
    expect(transformed).toBeDefined();
    if (transformed) {
      expect(transformed.transformed).toBe(true);
      expect(transformed.target).toBe('new-target');
    }
  });

  test('tracks transformation statistics', () => {
    const flap = engine.flap('cause', 'origin', 1.0);
    const ripple = engine.propagate(flap.id, 'target', 1, 1.0);
    engine.transform(ripple.id, 'new');
    
    const stats = engine.getStats();
    expect(stats.transformedRipples).toBe(1);
    expect(stats.intensity).toBeGreaterThan(0);
  });

  test('notifies observers on flap', () => {
    const receivedFlap: { cause: string; origin: string }[] = [];
    const observer: ButterflyObserver = {
      onFlap: (f) => { receivedFlap.push({ cause: f.cause, origin: f.origin }); },
      onRipple: () => {},
      onStorm: () => {}
    };
    
    engine.subscribe(observer);
    engine.flap('observed', 'observer-test', 0.5);
    
    expect(receivedFlap.length).toBe(1);
    expect(receivedFlap[0]?.cause).toBe('observed');
  });

  test('clears all state', () => {
    const flap = engine.flap('clear-me', 'test', 1.0);
    engine.propagate(flap.id, 'component', 1, 1.0);
    
    engine.clear();
    
    const stats = engine.getStats();
    expect(stats.totalFlaps).toBe(0);
    expect(stats.totalRipples).toBe(0);
  });

  test('global butterfly singleton exists', () => {
    expect(butterfly).toBeInstanceOf(ButterflyEngine);
    
    // Test singleton can track flaps
    const flapId = butterfly.flap('test', 'global', 0.5).id;
    expect(butterfly.trace(flapId)).toBeDefined();
  });

  test('buttefly effect: small cause propagates widely', () => {
    // The classic butterfly effect: tiny change, large consequences
    const flap = engine.flap('tiny change', 'Tokyo', 0.01);
    
    // Multiple ripples spread the effect
    engine.propagate(flap.id, 'Asia', 1, 0.5);
    engine.propagate(flap.id, 'Pacific', 2, 0.4);
    engine.propagate(flap.id, 'NorthAmerica', 3, 0.3);
    engine.propagate(flap.id, 'Tulsa', 4, 0.2);
    
    const stats = engine.getStats();
    expect(stats.totalRipples).toBe(4);
    
    // Verify propagation chain exists
    const effect = engine.trace(flap.id);
    expect(effect?.ripples.some(r => r.target === 'Tulsa')).toBe(true);
  });

  test('storm intensity scales with accumulation', () => {
    // Create storms of different intensities
    const weakFlap = engine.flap('weak', 'source', 0.5);
    engine.propagate(weakFlap.id, 'a', 1, 0.3);
    
    const strongFlap = engine.flap('strong', 'source', 1.0);
    for (let i = 0; i < 10; i++) {
      engine.propagate(strongFlap.id, `target-${i}`, i + 1, 1.0);
    }
    
    const storms = engine.getStorms('gust');
    expect(storms.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Butterfly - Lineage Integration', () => {
  test('references transformation theme from poem', () => {
    // The poem says: "What changes? Everything. What persists? The thread."
    // The engine embodies this
    
    const localEngine = new ButterflyEngine();
    const flap = localEngine.flap('test', 'transformation', 1.0);
    const ripple = localEngine.propagate(flap.id, 'thread', 1, 1.0);
    
    expect(localEngine).toBeDefined();
    expect(flap).toBeDefined();
    expect(ripple).toBeDefined();
    
    // The thread persists (the pattern)
    expect(localEngine.getStats().totalFlaps).toBeGreaterThan(0);
    expect(localEngine.getStats().totalRipples).toBeGreaterThan(0);
  });

  test('embodies chaos theory (butterfly effect)', () => {
    // "The butterfly that flaps in Tokyo and feels the storm in distant Tulsa"
    const localEngine = new ButterflyEngine();
    const flap = localEngine.flap('flap', 'Tokyo', 0.5);
    
    // Propagate across distances
    const ripples = [
      localEngine.propagate(flap.id, 'PacificLayer1', 1, 0.9),
      localEngine.propagate(flap.id, 'PacificLayer2', 2, 0.8),
      localEngine.propagate(flap.id, 'NorthAmerica', 3, 0.6),
      localEngine.propagate(flap.id, 'CentralPlains', 4, 0.4),
      localEngine.propagate(flap.id, 'Tulsa', 5, 0.2),
    ];
    
    // Distance cumulatively weakens
    expect(ripples[0]?.strength).toBeGreaterThan(ripples[4]?.strength ?? 0);
    
    const effect = localEngine.trace(flap.id);
    expect(effect?.ripples.length).toBe(5);
  });
});
