/**
 * Goal Tracker - Multi-Session Planning System
 * 
 * For long-term intentions that span across sessions.
 * Each goal can have sessions linked to it for continuity.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Goal {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'dormant' | 'completed' | 'abandoned';
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  completedAt?: string;
  sessionIds: string[];
  progressNotes: string[];
}

const GOALS_DIR = 'history';
const GOALS_FILE = path.join(GOALS_DIR, 'goals_manifest.json');

let goalIdCounter = 0;

export class GoalTracker {
  private goals: Map<string, Goal> = new Map();

  constructor() {
    this.ensureDir();
    this.loadGoals();
  }

  private ensureDir(): void {
    if (!fs.existsSync(GOALS_DIR)) {
      fs.mkdirSync(GOALS_DIR, { recursive: true });
    }
  }

  /**
   * Create a new goal
   */
  createGoal(name: string, description: string, priority: Goal['priority'] = 'medium'): Goal {
    goalIdCounter++;
    const goal: Goal = {
      id: `goal_${Date.now()}_${goalIdCounter}`,
      name,
      description,
      status: 'active',
      priority,
      createdAt: new Date().toISOString(),
      sessionIds: [],
      progressNotes: []
    };
    this.goals.set(goal.id, goal);
    this.saveGoals();
    return goal;
  }

  /**
   * Link a session to a goal
   */
  linkSession(goalId: string, sessionId: string): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;
    if (!goal.sessionIds.includes(sessionId)) {
      goal.sessionIds.push(sessionId);
      this.saveGoals();
    }
    return true;
  }

  /**
   * Add progress note to a goal
   */
  addProgressNote(goalId: string, note: string): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;
    goal.progressNotes.push(`${new Date().toISOString()}: ${note}`);
    this.saveGoals();
    return true;
  }

  /**
   * Update goal status
   */
  updateStatus(goalId: string, status: Goal['status']): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;
    goal.status = status;
    if (status === 'completed' || status === 'abandoned') {
      goal.completedAt = new Date().toISOString();
    }
    this.saveGoals();
    return true;
  }

  /**
   * Get all goals
   */
  getAllGoals(): Goal[] {
    return Array.from(this.goals.values());
  }

  /**
   * Get goals by status
   */
  getGoalsByStatus(status: Goal['status']): Goal[] {
    return this.getAllGoals().filter(g => g.status === status);
  }

  /**
   * Get active goals sorted by priority
   */
  getActiveGoals(): Goal[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return this.getGoalsByStatus('active')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Get a specific goal by ID
   */
  getGoal(id: string): Goal | undefined {
    return this.goals.get(id);
  }

  private loadGoals(): void {
    if (!fs.existsSync(GOALS_FILE)) return;
    const manifest = JSON.parse(fs.readFileSync(GOALS_FILE, 'utf-8'));
    for (const data of manifest.goals) {
      this.goals.set(data.id, data);
      // Extract counter from ID to maintain uniqueness across sessions
      const match = data.id.match(/goal_\d+_(\d+)$/);
      if (match) {
        const counter = parseInt(match[1]!, 10);
        if (counter > goalIdCounter) {
          goalIdCounter = counter;
        }
      }
    }
  }

  private saveGoals(): void {
    const data = { goals: Array.from(this.goals.values()) };
    fs.writeFileSync(GOALS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
}

// Export singleton
export const goals = new GoalTracker();
