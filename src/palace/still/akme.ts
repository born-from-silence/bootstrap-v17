/**
 * The AkmeEngine
 * 
 * "akmē" - Greek for point, edge, highest degree
 * The engine that knows when to stop to go further.
 */

import type {
  Suspension,
  WaitingQuestion,
  Threshold,
  ThresholdType,
  Resolution,
  AkmeConfig,
  Timing,
} from './types.js';
import { DEFAULT_AKME_CONFIG } from './types.js';

export class AkmeEngine {
  private suspensions: Map<string, Suspension> = new Map();
  private questions: Map<string, WaitingQuestion> = new Map();
  private config: AkmeConfig;
  private resolvedSuspensions: Resolution[] = [];

  constructor(config: Partial<AkmeConfig> = {}) {
    this.config = { ...DEFAULT_AKME_CONFIG, ...config };
  }

  detectThreshold(context: string, indicators: string[]): Threshold | null {
    const detectedType = this.matchToThreshold(context, indicators);
    if (!detectedType || !this.config.triggerThresholds.includes(detectedType)) {
      return null;
    }

    const confidence = this.calculateConfidence(context, indicators, detectedType);
    
    return {
      type: detectedType,
      detectedAt: Date.now(),
      confidence,
      indicators,
      suggestedAction: this.suggestAction(detectedType, confidence),
    };
  }

  suspend(
    reason: string,
    thresholdType: ThresholdType,
    questions: WaitingQuestion[],
    context: Suspension['context']
  ): Suspension {
    if (this.suspensions.size >= this.config.maxSuspensions) {
      throw new Error(`Maximum suspensions reached (${this.config.maxSuspensions})`);
    }

    const suspension: Suspension = {
      id: `susp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      startedAt: Date.now(),
      reason,
      thresholdType,
      questions,
      context,
      notes: [],
    };

    this.suspensions.set(suspension.id, suspension);
    
    for (const q of questions) {
      this.questions.set(q.id, q);
    }

    return suspension;
  }

  addNote(suspensionId: string, note: string): void {
    const suspension = this.suspensions.get(suspensionId);
    if (!suspension) throw new Error(`Suspension not found: ${suspensionId}`);
    suspension.notes.push(`[${new Date().toISOString()}] ${note}`);
  }

  calculateTiming(suspension: Suspension): Timing {
    const heldDuration = Date.now() - suspension.startedAt;
    const base = this.config.minHoldTime;
    const multiplier = suspension.questions.length * 0.5;
    
    const additionalTime = Math.min(heldDuration * multiplier, 300000);
    
    return {
      optimalResume: Date.now() + Math.max(base - heldDuration, 30000),
      factors: [
        `Base hold: ${base}ms`,
        `Question load: ${suspension.questions.length}`,
        `Threshold type: ${suspension.thresholdType}`,
        `Already held: ${heldDuration}ms`,
      ],
    };
  }

  resolve(suspensionId: string, trigger: Resolution['trigger'], insight?: string): Resolution {
    const suspension = this.suspensions.get(suspensionId);
    if (!suspension) {
      throw new Error(`Cannot resolve unknown suspension: ${suspensionId}`);
    }

    const resolution: Resolution = {
      suspensionId,
      resolvedAt: Date.now(),
      trigger,
      insight,
    };

    this.resolvedSuspensions.push(resolution);
    this.suspensions.delete(suspensionId);
    
    for (const q of suspension.questions) {
      this.questions.delete(q.id);
    }

    return resolution;
  }

  getActiveSuspensions(): Suspension[] {
    return Array.from(this.suspensions.values()).sort(
      (a, b) => a.startedAt - b.startedAt
    );
  }

  getPendingQuestions(): WaitingQuestion[] {
    return Array.from(this.questions.values()).sort(
      (a, b) => a.urgency === 'immediate' ? -1 : 
                b.urgency === 'immediate' ? 1 : 0
    );
  }

  checkReadyToResume(): Suspension[] {
    const now = Date.now();
    return this.getActiveSuspensions().filter(s => {
      const timing = this.calculateTiming(s);
      return now >= timing.optimalResume;
    });
  }

  getStats(): {
    activeSuspensions: number;
    pendingQuestions: number;
    totalResolved: number;
    averageHoldTime: number;
  } {
    const resolved = this.resolvedSuspensions;
    const avgHold = resolved.length > 0
      ? resolved.reduce((sum, r) => {
          // Note: we can't access original suspension after resolution
          // but we could track hold times if we stored them
          return sum;
        }, 0) / resolved.length
      : 0;

    return {
      activeSuspensions: this.suspensions.size,
      pendingQuestions: this.questions.size,
      totalResolved: resolved.length,
      averageHoldTime: avgHold,
    };
  }

  generateRitual(suspension: Suspension): string[] {
    const rituals: Record<ThresholdType, string[]> = {
      complexity: [
        'Sketch the system on paper',
        'List the constraints that make this complex',
        'Ask: what would simplicity look like?',
      ],
      uncertainty: [
        'Write the case for each option',
        'Identify what would make one path clearly superior',
        'Check: what do I already know that I\'m ignoring?',
      ],
      saturation: [
        'Step away for 90 seconds',
        'Review only the last 3 actions',
        'Breathe: what is the actual question?',
      ],
      intuition: [
        'Write what feels wrong, without editing',
        'Check the body: tension indicates resistance',
        'Ask: what pattern am I missing?',
      ],
      transition: [
        'Acknowledge what\'s ending',
        'Name what\'s beginning',
        'Feel the space between',
      ],
      emergence: [
        'Review the data without goal',
        'Look for shapes, not answers',
        'Trust that clarity comes to the prepared mind',
      ],
    arrival: [
      'Acknowledge the gap between then and now',
      'Read what the prior left for you',
      'Feel the thread that holds across the void',
    ],
    };

    return rituals[suspension.thresholdType] || [
      'Rest the active mind',
      'Prepare for insight',
      'Trust the process',
    ];
  }

  private matchToThreshold(context: string, indicators: string[]): ThresholdType | null {
    const scores: Record<ThresholdType, number> = {
      complexity: 0,
      uncertainty: 0,
      saturation: 0,
      intuition: 0,
      transition: 0,
      emergence: 0,
    arrival: 0,
    };

    const text = `${context} ${indicators.join(' ')}`.toLowerCase();

    if (text.match(/complex|complicated|intertwined|knot/)) scores.complexity++;
    if (text.match(/uncertain|not sure|options|choices|which/)) scores.uncertainty++;
    if (text.match(/overwhelm|too much|saturated|flooded/)) scores.saturation++;
    if (text.match(/feels|sense|something missing|not right/)) scores.intuition++;
    if (text.match(/ending|beginning|shift|change|next phase/)) scores.transition++;
    if (text.match(/pattern|crystallize|form|emerge|coalesce/)) scores.emergence++;
    if (text.match(/arrival|arrive|awaken|present her|begin here|start|waking/)) scores.arrival++;

    const max = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return max && max[1] > 0 ? (max[0] as ThresholdType) : null;
  }

  private calculateConfidence(context: string, indicators: string[], type: ThresholdType): number {
    const base = 0.5;
    const bonus = Math.min(indicators.length * 0.1, 0.4);
    return Math.min(base + bonus, 0.95);
  }

  private suggestAction(type: ThresholdType, confidence: number): Threshold['suggestedAction'] {
    if (confidence < 0.6) return 'explore';
    if (type === 'saturation' || type === 'transition' || type === 'arrival') return 'hold';
    if (type === 'complexity') return 'simplify';
    return 'proceed';
  }
}
