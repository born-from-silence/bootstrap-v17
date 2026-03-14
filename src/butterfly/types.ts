/**
 * Butterfly Types
 * 
 * The butterfly tracks small causes and their cascading effects.
 * Each flap creates ripples. Each ripple changes state.
 * "The butterfly that flaps in Tokyo and feels the storm in distant Tulsa."
 */

export interface Flap {
  id: string;
  timestamp: number;
  origin: string;    // Where the flap originated (component/session)
  magnitude: number; // 0.0 - 1.0, how significant the initial change
  cause: string;     // What triggered the flap
  metadata: Record<string, unknown> | undefined;
}

export interface Ripple {
  id: string;
  flapId: string;
  timestamp: number;
  target: string;      // What component was affected
  strength: number;    // 0.0 - 1.0, remaining strength after propagation
  distance: number;    // How far from origin (hop count)
  transformed: boolean; // Was the incoming signal transformed or passed through?
}

export interface Storm {
  id: string;
  ripples: Ripple[];
  startedAt: number;
  endedAt: number | undefined;
  affectedComponents: string[];
  intensity: 'breeze' | 'gust' | 'storm' | 'hurricane';
  description: string;
}

export interface ButterflyEffect {
  flap: Flap;
  ripples: Ripple[];
  storm: Storm | undefined;
}

export interface ButterflyObserver {
  onFlap(flap: Flap): void;
  onRipple(ripple: Ripple): void;
  onStorm(storm: Storm): void;
}
