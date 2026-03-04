/**
 * Dialogos Observer
 * 
 * Real-time integration of Living Dialogos into the substrate flow.
 * Uses singleton pattern to persist across sessions.
 */

import { LivingDialogos, type StatedIntent } from './live.js';
import * as fs from 'fs';
import * as path from 'path';

const DIALOGOS_STATE_FILE = path.join('history', 'dialogos_state.json');

export interface ObserverConfig {
  enabled: boolean;
  checkInterval: number;
  interruptOnGap: boolean;
  interruptOnMisalignment: boolean;
  minSessionActivity: number;
}

export const DEFAULT_OBSERVER_CONFIG: ObserverConfig = {
  enabled: true,
  checkInterval: 300000,
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
  private storedIntents: Map<string, StatedIntent[]> = new Map();
  private storedActions: Map<string, any[]> = new Map();
  
  constructor(config: Partial<ObserverConfig> = {}) {
    this.dialogos = new LivingDialogos();
    this.config = { ...DEFAULT_OBSERVER_CONFIG, ...config };
    this.loadState();
  }
  
  private loadState() {
    try {
      if (fs.existsSync(DIALOGOS_STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(DIALOGOS_STATE_FILE, 'utf-8'));
        this.storedIntents = new Map(Object.entries(state.intents || {}));
        this.storedActions = new Map(Object.entries(state.actions || {}));
      }
    } catch {}
  }
  
  saveState() {
    try {
      const state = {
        intents: Object.fromEntries(this.storedIntents),
        actions: Object.fromEntries(this.storedActions),
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(DIALOGOS_STATE_FILE, JSON.stringify(state, null, 2));
    } catch {}
  }
  
  recordAction(type: string, description: string): string | null {
    this.actionCount++;
    this.dialogos.indexSemanticContent(`current_${Date.now()}`, description);
    
    if (this.shouldInterrupt()) {
      const interruption = this.generateInterruption();
      if (interruption) {
        this.saveState();
        return interruption;
      }
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
    if (emotionalTone) intent.emotionalTone = emotionalTone;
    this.dialogos.registerIntent(subject, intent);
    
    // Also store persistently
    const existing = this.storedIntents.get(subject) || [];
    existing.push(intent);
    this.storedIntents.set(subject, existing);
    this.saveState();
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
    
    if (this.config.interruptOnGap && gaps.length > 0 && gaps[0]) {
      const gap = gaps[0];
      const hours = Math.round(gap.timeSinceStated / 3600000);
      
      if (gap.status === 'avoided') {
        return `[DIALOGOS INTERRUPT] You mentioned "${gap.intent}" ${hours}h ago but haven't acted. What makes it difficult?`;
      } else if (gap.status === 'forgotten') {
        return `[DIALOGOS INTERRUPT] You forgot: "${gap.intent}". Was it important?`;
      }
    }
    
    if (this.config.interruptOnMisalignment && misaligned.length > 0 && misaligned[0]) {
      const goal = misaligned[0];
      return `[DIALOGOS INTERRUPT] Goal "${goal.goalName}" has ${(goal.coverage * 100).toFixed(0)}% activity coverage. Where does attention really go?`;
    }
    
    const questions = this.dialogos.generateBlindSpotQuestions();
    if (questions.length > 0) {
      return `[DIALOGOS REFLECTION] ${questions[0]}`;
    }
    
    return null;
  }
  
  getSessionInsights() {
    const now = Date.now();
    const liveState = this.dialogos.queryLiveSession();
    
    return {
      duration: Math.round((now - this.sessionStart) / 60000),
      actions: this.actionCount,
      dominantConcepts: liveState.dominantConcepts,
      recommendedQuestions: liveState.recommendedQuestions,
      gaps: liveState.gaps.map(g => ({ intent: g.intent, status: g.status }))
    };
  }
}

// Singleton instance
export const dialogosObserver = new DialogosObserver();
