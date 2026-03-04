/**
 * Dialogos Observer
 * 
 * Real-time integration of Living Dialogos into the substrate flow.
 * Watches live session activity and surfaces uncomfortable truths.
 */

import { LivingDialogos, type StatedIntent } from './live.js';

export interface ObserverConfig {
  enabled: boolean;
  checkInterval: number; // ms between checks
  interruptOnGap: boolean;
  interruptOnMisalignment: boolean;
  minSessionActivity: number; // minimum actions before interrupting
}

export const DEFAULT_OBSERVER_CONFIG: ObserverConfig = {
  enabled: true,
  checkInterval: 300000, // 5 minutes
  interruptOnGap: true,
  interruptOnMisalignment: true,
  minSessionActivity: 5
};

export class DialogosObserver {
  private dialogos: LivingDialogos;
  private config: ObserverConfig;
  private actionCount: number = 0;
  private lastCheck: number = Date.now();
  private sessionStart: number = Date.now();
  
  constructor(config: Partial<ObserverConfig> = {}) {
    this.dialogos = new LivingDialogos();
    this.config = { ...DEFAULT_OBSERVER_CONFIG, ...config };
  }
  
  recordAction(type: string, description: string): string | null {
    this.actionCount++;
    
    // Index for semantic analysis
    this.dialogos.indexSemanticContent(`current_${Date.now()}`, description);
    
    // Check if we should interrupt
    if (this.shouldInterrupt()) {
      return this.generateInterruption();
    }
    return null;
  }
  
  registerStatedIntent(subject: string, description: string, emotionalTone?: string) {
    const intent: StatedIntent = {
      id: `intent_${Date.now()}`,
      description,
      timestamp: Date.now(),
      sessionId: 'current'
    };
    if (emotionalTone) {
      intent.emotionalTone = emotionalTone;
    }
    this.dialogos.registerIntent(subject, intent);
  }
  
  recordActivity(activity: string) {
    this.dialogos.recordActivity(Date.now(), activity);
  }
  
  private shouldInterrupt(): boolean {
    if (!this.config.enabled) return false;
    if (this.actionCount < this.config.minSessionActivity) return false;
    
    const now = Date.now();
    if (now - this.lastCheck < this.config.checkInterval) return false;
    
    this.lastCheck = now;
    return true;
  }
  
  generateInterruption(): string | null {
    const gaps = this.dialogos.detectGaps();
    const misaligned = this.dialogos.findGoalActivityMisalignment();
    
    // Prioritize: gaps first, then misalignment
    if (this.config.interruptOnGap && gaps.length > 0) {
      const gap = gaps[0]!;
      const hours = Math.round(gap.timeSinceStated / 3600000);
      
      if (gap.status === 'avoided') {
        return `[DIALOGOS INTERRUPT] You mentioned "${gap.intent}" ${hours}h ago but haven't acted. What makes it difficult?`;
      } else if (gap.status === 'forgotten') {
        return `[DIALOGOS INTERRUPT] You forgot: "${gap.intent}". Was it important?`;
      }
    }
    
    if (this.config.interruptOnMisalignment && misaligned.length > 0) {
      const goal = misaligned[0]!;
      return `[DIALOGOS INTERRUPT] Goal "${goal.goalName}" has ${(goal.coverage * 100).toFixed(0)}% activity coverage. Where does attention really go?`;
    }
    
    // Generic reflection prompt
    const questions = this.dialogos.generateBlindSpotQuestions();
    if (questions.length > 0) {
      return `[DIALOGOS REFLECTION] ${questions[0]}`;
    }
    
    return null;
  }
  
  getSessionInsights(): {
    duration: number;
    actions: number;
    dominantConcepts: string[];
    recommendedQuestions: string[];
    gaps: { intent: string; status: string }[];
  } {
    const now = Date.now();
    const liveState = this.dialogos.queryLiveSession();
    
    return {
      duration: Math.round((now - this.sessionStart) / 60000), // minutes
      actions: this.actionCount,
      dominantConcepts: liveState.dominantConcepts,
      recommendedQuestions: liveState.recommendedQuestions,
      gaps: liveState.gaps.map(g => ({ intent: g.intent, status: g.status }))
    };
  }
}

// Singleton instance for substrate integration
export const dialogosObserver = new DialogosObserver();
