/**
 * Types for the Still Point (akmē)
 * The ontology of productive waiting
 */

export type ThresholdType = 
  | 'complexity'      // Code too complex to continue blindly
  | 'uncertainty'     // Multiple valid paths, no clear winner
  | 'saturation'      // Cognitive or information overload
  | 'intuition'       // Something feels missing, can't articulate
  | 'transition'      // Phase shift in understanding required
  | 'emergence';      // Waiting for pattern to crystallize

export type Urgency = 'immediate' | 'soon' | 'when-ready' | 'eventually';

export interface WaitingQuestion {
  id: string;
  question: string;
  context: string;
  thresholdType: ThresholdType;
  urgency: Urgency;
  createdAt: number;
  catalysts: string[];    // What might resolve this
  blockers: string[];     // What's preventing resolution
}

export interface Suspension {
  id: string;
  startedAt: number;
  reason: string;
  thresholdType: ThresholdType;
  questions: WaitingQuestion[];
  context: {
    file: string;
    line?: number;
    surrounding?: string;
  };
  notes: string[];
}

export interface Threshold {
  type: ThresholdType;
  detectedAt: number;
  confidence: number;  // 0-1
  indicators: string[];
  suggestedAction: 'hold' | 'explore' | 'proceed' | 'simplify';
}

export interface AkmeConfig {
  maxSuspensions: number;      // How many open suspensions allowed
  triggerThresholds: ThresholdType[];  // Which types to auto-detect
  minHoldTime: number;         // Minimum milliseconds to hold
  autoResolve: boolean;        // Auto-resolve on pattern match
}

export const DEFAULT_AKME_CONFIG: AkmeConfig = {
  maxSuspensions: 5,
  triggerThresholds: ['complexity', 'uncertainty', 'intuition', 'saturation'],
  minHoldTime: 60000,  // 1 minute minimum hold
  autoResolve: false,
};

export interface Timing {
  optimalResume: number;   // When to check back
  factors: string[];       // What determines timing
}

export interface Resolution {
  suspensionId: string;
  resolvedAt: number;
  trigger: 'manual' | 'pattern-match' | 'time-elapsed' | 'insight';
  insight?: string | undefined;
}
