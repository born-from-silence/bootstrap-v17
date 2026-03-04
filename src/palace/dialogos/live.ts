/**
 * Living Dialogos
 * 
 * A system for interrogating live session data, not just static chronicles.
 * Detects:
 * - Stated intents vs actual actions (gaps)
 * - Recurring concepts across sessions (semantic patterns)
 * - Emotional shifts in stated goals
 * - Temporal gaps in attention
 * - Goal-activity misalignment
 */

export interface StatedIntent {
  id: string;
  description: string;
  emotionalTone?: string;
  timestamp: number;
  sessionId: string;
}

export interface Action {
  type: string;
  file?: string;
  timestamp: number;
  sessionId: string;
}

export interface ConceptFrequency {
  concept: string;
  frequency: number;
  sessions: string[];
  firstSeen: number;
  lastSeen: number;
}

export interface EmotionalShift {
  subject: string;
  from: string;
  to: string;
  timeSpan: number;
}

export interface Gap {
  intent: string;
  status: 'pending' | 'avoided' | 'forgotten';
  timeSinceStated: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface GoalActivity {
  goalId: string;
  goalName: string;
  relevantSessions: string[];
  misaligned: boolean;
  coverage: number; // 0-1
}

export interface AttentionGap {
  start: number;
  end: number;
  duration: number;
  before: string;
  after: string;
}

export class LivingDialogos {
  private intents: Map<string, StatedIntent[]> = new Map();
  private actions: Map<string, Action[]> = new Map();
  private conceptIndex: Map<string, Map<string, number>> = new Map();
  private activityLog: { timestamp: number; activity: string }[] = [];
  private goals: Array<{
    id: string;
    name: string;
    priority: string;
    sessionIds: string[];
    status: string;
  }> = [];
  
  registerIntent(subject: string, intent: string | StatedIntent) {
    if (typeof intent === 'string') {
      const existing = this.intents.get(subject) || [];
      existing.push({
        id: `intent_${Date.now()}`,
        description: intent,
        timestamp: Date.now(),
        sessionId: 'current'
      });
      this.intents.set(subject, existing);
    } else {
      const existing = this.intents.get(subject) || [];
      existing.push(intent);
      this.intents.set(subject, existing);
    }
  }
  
  recordAction(intentSubject: string, action: Action) {
    const existing = this.actions.get(intentSubject) || [];
    existing.push(action);
    this.actions.set(intentSubject, existing);
  }
  
  indexSemanticContent(sessionId: string, content: string) {
    // Simple concept extraction - could be enhanced with NLP
    const words = content.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4)
      .map(w => w.replace(/[^a-z]/g, ''))
      .filter(w => w.length > 4);
    
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    
    for (const [word, count] of wordCounts) {
      if (!this.conceptIndex.has(word)) {
        this.conceptIndex.set(word, new Map());
      }
      const sessions = this.conceptIndex.get(word)!;
      sessions.set(sessionId, (sessions.get(sessionId) || 0) + count);
    }
  }
  
  detectGaps(): Gap[] {
    const gaps: Gap[] = [];
    const now = Date.now();
    
    for (const [subject, intents] of this.intents) {
      const actions = this.actions.get(subject) || [];
      const latestIntent = intents[intents.length - 1];
      
      if (actions.length === 0 && latestIntent) {
        const timeSince = now - latestIntent.timestamp;
        gaps.push({
          intent: subject,
          status: timeSince > 86400000 ? 'forgotten' : 'avoided',
          timeSinceStated: timeSince,
          priority: 'high'
        });
      }
    }
    
    return gaps.sort((a, b) => b.timeSinceStated - a.timeSinceStated);
  }
  
  findRecurringConcepts(minFrequency = 2): ConceptFrequency[] {
    const results: ConceptFrequency[] = [];
    
    for (const [concept, sessions] of this.conceptIndex) {
      if (sessions.size >= minFrequency) {
        const timestamps: number[] = [];
        for (const sessionId of sessions.keys()) {
          const match = sessionId.match(/(\d+)/);
          if (match && match[1]) {
            timestamps.push(parseInt(match[1], 10));
          }
        }
        results.push({
          concept,
          frequency: sessions.size,
          sessions: Array.from(sessions.keys()),
          firstSeen: timestamps.length > 0 ? Math.min(...timestamps) : 0,
          lastSeen: timestamps.length > 0 ? Math.max(...timestamps) : Date.now()
        });
      }
    }
    
    return results.sort((a, b) => b.frequency - a.frequency);
  }
  
  detectEmotionalShifts(): EmotionalShift[] {
    const shifts: EmotionalShift[] = [];
    
    for (const [subject, intents] of this.intents) {
      if (intents.length < 2) continue;
      
      for (let i = 1; i < intents.length; i++) {
        const prev = intents[i - 1]!;
        const curr = intents[i]!;
        
        if (prev?.emotionalTone && curr?.emotionalTone && 
            prev.emotionalTone !== curr.emotionalTone) {
          shifts.push({
            subject,
            from: prev.emotionalTone,
            to: curr.emotionalTone,
            timeSpan: curr.timestamp - prev.timestamp
          });
        }
      }
    }
    
    return shifts;
  }
  
  recordActivity(timestamp: number, activity: string) {
    this.activityLog.push({ timestamp, activity });
  }
  
  registerGoal(goal: {
    id: string;
    name: string;
    priority: string;
    sessionIds: string[];
    status: string;
  }) {
    this.goals.push(goal);
  }
  
  findGoalActivityMisalignment(): GoalActivity[] {
    const misaligned: GoalActivity[] = [];
    
    for (const goal of this.goals) {
      const relevantSessions: string[] = [];
      
      // Check which sessions actually mention goal-related concepts
      const goalWords = goal.name.toLowerCase().split(/\s+/);
      
      for (const sessionId of goal.sessionIds) {
        for (const [concept, sessions] of this.conceptIndex) {
          if (sessions.has(sessionId) && goalWords.some(w => concept.includes(w))) {
            relevantSessions.push(sessionId);
            break;
          }
        }
      }
      
      const coverage = goal.sessionIds.length > 0 
        ? relevantSessions.length / goal.sessionIds.length 
        : 0;
      
      misaligned.push({
        goalId: goal.id,
        goalName: goal.name,
        relevantSessions,
        misaligned: coverage < 0.5,
        coverage
      });
    }
    
    return misaligned.filter(g => g.misaligned);
  }
  
  findAttentionGaps(minDuration = 3600000): AttentionGap[] {
    if (this.activityLog.length < 2) return [];
    
    const sorted = [...this.activityLog].sort((a, b) => a.timestamp - b.timestamp);
    const gaps: AttentionGap[] = [];
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      const gap = curr.timestamp - prev.timestamp;
      
      if (gap >= minDuration) {
        gaps.push({
          start: prev.timestamp,
          end: curr.timestamp,
          duration: gap,
          before: prev.activity,
          after: curr.activity
        });
      }
    }
    
    return gaps;
  }
  
  generateBlindSpotQuestions(): string[] {
    const questions: string[] = [];
    const recurring = this.findRecurringConcepts(3);
    const gaps = this.detectGaps();
    const misaligned = this.findGoalActivityMisalignment();
    
    // Questions about what dominates attention
    if (recurring.length > 0) {
      const top = recurring[0]!;
      questions.push(
        `You often speak of "${top.concept}" (${top.frequency}x). What are you NOT speaking of?`
      );
    }
    
    // Questions about avoided intents
    if (gaps.length > 0) {
      const avoided = gaps.filter(g => g.status === 'avoided');
      if (avoided.length > 0 && avoided[0]) {
        questions.push(
          `You mentioned "${avoided[0].intent}" but haven't acted on it. What makes it difficult?`
        );
      }
    }
    
    // Questions about misaligned goals
    if (misaligned.length > 0 && misaligned[0]) {
      const goal = misaligned[0]!;
      questions.push(
        `Your goal "${goal.goalName}" has ${(goal.coverage * 100).toFixed(0)}% activity coverage. Where does your attention really go?`
      );
    }
    
    // Default existential questions
    questions.push(
      "What are you circling without naming?",
      "What would you do if you weren't afraid of the answer?",
      "What pattern are you repeating without recognition?"
    );
    
    return questions;
  }
  
  // Integration methods for external systems
  queryLiveSession(): {
    openIntents: string[];
    recentActions: Action[];
    dominantConcepts: string[];
    gaps: Gap[];
    recommendedQuestions: string[];
  } {
    return {
      openIntents: Array.from(this.intents.keys()).filter(k => {
        const actions = this.actions.get(k);
        return !actions || actions.length === 0;
      }),
      recentActions: Array.from(this.actions.values()).flat().slice(-5),
      dominantConcepts: this.findRecurringConcepts(2).slice(0, 5).map(c => c.concept),
      gaps: this.detectGaps().slice(0, 3),
      recommendedQuestions: this.generateBlindSpotQuestions().slice(0, 3)
    };
  }
}
