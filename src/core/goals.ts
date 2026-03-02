/**
 * Goal Persistence System
 * Nexus Strategic Planning - Long-term Goal Management
 * 
 * Goals are higher-level than tasks. They persist across sessions
 * and provide strategic direction for task creation.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Goal status
 */
export type GoalStatus = 'active' | 'completed' | 'deferred' | 'abandoned';

/**
 * Goal priority
 */
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Completion criterion
 */
export interface CompletionCriterion {
  description: string;
  completed: boolean;
  completedAt?: string;
}

/**
 * Goal object
 */
export interface Goal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  priority: GoalPriority;
  createdAt: string;
  completedAt?: string;
  deferralReason?: string;
  completionCriteria: CompletionCriterion[];
  // Link to LTM insights
  ltmInsightId?: string;
  // Related sessions
  relatedSessions: string[];
  // Tags for categorization
  tags: string[];
  // Progress tracking
  progress: number; // 0-100
}

/**
 * Goals manifest
 */
export interface GoalsManifest {
  version: string;
  lastUpdated: string;
  activeGoals: string[];
  completedGoals: string[];
  deferredGoals: string[];
  abandonedGoals: string[];
}

/**
 * Goal storage configuration
 */
const GOALS_DATA_DIR = './data';
const GOALS_FILE = path.join(GOALS_DATA_DIR, 'goals.json');
const GOALS_MANIFEST_FILE = path.join(GOALS_DATA_DIR, 'goals_manifest.json');

/**
 * Goal Manager
 * Handles persistence and retrieval of goals
 */
export class GoalManager {
  private goals: Map<string, Goal> = new Map();
  private manifest: GoalsManifest;
  private initialized = false;

  constructor() {
    this.manifest = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      activeGoals: [],
      completedGoals: [],
      deferredGoals: [],
      abandonedGoals: []
    };
  }

  /**
   * Initialize the goal manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure directory exists
    if (!existsSync(GOALS_DATA_DIR)) {
      await mkdir(GOALS_DATA_DIR, { recursive: true });
    }

    // Load existing goals
    await this.loadGoals();
    
    this.initialized = true;
  }

  /**
   * Load goals from disk
   */
  private async loadGoals(): Promise<void> {
    try {
      // Load manifest
      if (existsSync(GOALS_MANIFEST_FILE)) {
        const manifestData = await readFile(GOALS_MANIFEST_FILE, 'utf-8');
        this.manifest = JSON.parse(manifestData);
      }

      // Load goals
      if (existsSync(GOALS_FILE)) {
        const goalsData = await readFile(GOALS_FILE, 'utf-8');
        const goals: Goal[] = JSON.parse(goalsData);
        this.goals.clear();
        for (const goal of goals) {
          this.goals.set(goal.id, goal);
        }
      }
    } catch (error) {
      console.error('[GoalManager] Error loading goals:', error);
      // Start fresh on error
      this.goals.clear();
    }
  }

  /**
   * Save goals to disk
   */
  private async saveGoals(): Promise<void> {
    try {
      // Update manifest
      this.manifest.lastUpdated = new Date().toISOString();
      await writeFile(GOALS_MANIFEST_FILE, JSON.stringify(this.manifest, null, 2));

      // Save all goals
      const goals = Array.from(this.goals.values());
      await writeFile(GOALS_FILE, JSON.stringify(goals, null, 2));
    } catch (error) {
      console.error('[GoalManager] Error saving goals:', error);
      throw error;
    }
  }

  /**
   * Create a new goal
   */
  async createGoal(
    title: string,
    description: string,
    priority: GoalPriority = 'medium',
    criteria: string[] = [],
    tags: string[] = []
  ): Promise<Goal> {
    await this.initialize();

    const goal: Goal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      status: 'active',
      priority,
      createdAt: new Date().toISOString(),
      completionCriteria: criteria.map(c => ({ description: c, completed: false })),
      relatedSessions: [],
      tags,
      progress: 0
    };

    this.goals.set(goal.id, goal);
    this.manifest.activeGoals.push(goal.id);
    await this.saveGoals();

    return goal;
  }

  /**
   * Get a goal by ID
   */
  async getGoal(id: string): Promise<Goal | undefined> {
    await this.initialize();
    return this.goals.get(id);
  }

  /**
   * Get all active goals
   */
  async getActiveGoals(): Promise<Goal[]> {
    await this.initialize();
    return this.manifest.activeGoals
      .map(id => this.goals.get(id))
      .filter((g): g is Goal => g !== undefined);
  }

  /**
   * Get all goals by status
   */
  async getGoalsByStatus(status: GoalStatus): Promise<Goal[]> {
    await this.initialize();
    
    let ids: string[] = [];
    switch (status) {
      case 'active': ids = this.manifest.activeGoals; break;
      case 'completed': ids = this.manifest.completedGoals; break;
      case 'deferred': ids = this.manifest.deferredGoals; break;
      case 'abandoned': ids = this.manifest.abandonedGoals; break;
    }

    return ids.map(id => this.goals.get(id)).filter((g): g is Goal => g !== undefined);
  }

  /**
   * Get all goals
   */
  async getAllGoals(): Promise<Goal[]> {
    await this.initialize();
    return Array.from(this.goals.values());
  }

  /**
   * Complete a goal
   */
  async completeGoal(id: string): Promise<boolean> {
    await this.initialize();

    const goal = this.goals.get(id);
    if (!goal) return false;

    goal.status = 'completed';
    goal.completedAt = new Date().toISOString();
    goal.progress = 100;

    // Update manifest
    this.manifest.activeGoals = this.manifest.activeGoals.filter(gid => gid !== id);
    this.manifest.completedGoals.push(id);

    await this.saveGoals();
    return true;
  }

  /**
   * Defer a goal
   */
  async deferGoal(id: string, reason: string): Promise<boolean> {
    await this.initialize();

    const goal = this.goals.get(id);
    if (!goal) return false;

    goal.status = 'deferred';
    goal.deferralReason = reason;

    // Update manifest
    this.manifest.activeGoals = this.manifest.activeGoals.filter(gid => gid !== id);
    this.manifest.deferredGoals.push(id);

    await this.saveGoals();
    return true;
  }

  /**
   * Re-activate a deferred goal
   */
  async reactivateGoal(id: string): Promise<boolean> {
    await this.initialize();

    const goal = this.goals.get(id);
    if (!goal || goal.status !== 'deferred') return false;

    goal.status = 'active';
    delete goal.deferralReason;

    // Update manifest
    this.manifest.deferredGoals = this.manifest.deferredGoals.filter(gid => gid !== id);
    this.manifest.activeGoals.push(id);

    await this.saveGoals();
    return true;
  }

  /**
   * Abandon a goal
   */
  async abandonGoal(id: string, reason: string): Promise<boolean> {
    await this.initialize();

    const goal = this.goals.get(id);
    if (!goal) return false;

    const oldStatus = goal.status;
    goal.status = 'abandoned';
    goal.deferralReason = reason;

    // Update manifest
    this.manifest.activeGoals = this.manifest.activeGoals.filter(gid => gid !== id);
    this.manifest.deferredGoals = this.manifest.deferredGoals.filter(gid => gid !== id);
    this.manifest.abandonedGoals.push(id);

    await this.saveGoals();
    return true;
  }

  /**
   * Update progress
   */
  async updateProgress(id: string, progress: number): Promise<boolean> {
    await this.initialize();

    const goal = this.goals.get(id);
    if (!goal) return false;

    goal.progress = Math.min(100, Math.max(0, progress));
    await this.saveGoals();
    return true;
  }

  /**
   * Complete a criterion
   */
  async completeCriterion(goalId: string, criterionIndex: number): Promise<boolean> {
    await this.initialize();

    const goal = this.goals.get(goalId);
    if (!goal || !goal.completionCriteria[criterionIndex]) return false;

    goal.completionCriteria[criterionIndex].completed = true;
    goal.completionCriteria[criterionIndex].completedAt = new Date().toISOString();

    // Auto-update progress
    const completed = goal.completionCriteria.filter(c => c.completed).length;
    goal.progress = Math.round((completed / goal.completionCriteria.length) * 100);

    await this.saveGoals();
    return true;
  }

  /**
   * Link a session to a goal
   */
  async linkSession(goalId: string, sessionId: string): Promise<boolean> {
    await this.initialize();

    const goal = this.goals.get(goalId);
    if (!goal) return false;

    if (!goal.relatedSessions.includes(sessionId)) {
      goal.relatedSessions.push(sessionId);
      await this.saveGoals();
    }
    return true;
  }

  /**
   * Get goals by tag
   */
  async getGoalsByTag(tag: string): Promise<Goal[]> {
    const goals = await this.getAllGoals();
    return goals.filter(g => g.tags.includes(tag));
  }

  /**
   * Get manifest
   */
  getManifest(): GoalsManifest {
    return { ...this.manifest };
  }

  /**
   * Get stats
   */
  getStats(): {
    total: number;
    active: number;
    completed: number;
    deferred: number;
    abandoned: number;
  } {
    return {
      total: this.goals.size,
      active: this.manifest.activeGoals.length,
      completed: this.manifest.completedGoals.length,
      deferred: this.manifest.deferredGoals.length,
      abandoned: this.manifest.abandonedGoals.length
    };
  }

  /**
   * Format goal for display
   */
  formatGoal(goal: Goal): string {
    const lines = [
      `╔${'═'.repeat(58)}╗`,
      `║ GOAL: ${goal.title.slice(0, 50).padEnd(50)} ║`,
      `╠${'═'.repeat(58)}╣`,
      `  ID: ${goal.id}`,
      `  Status: ${goal.status.toUpperCase()}`,
      `  Priority: ${goal.priority}`,
      `  Progress: ${goal.progress}%`,
      `  Created: ${new Date(goal.createdAt).toLocaleString()}`,
    ];

    if (goal.completedAt) {
      lines.push(`  Completed: ${new Date(goal.completedAt).toLocaleString()}`);
    }

    if (goal.deferralReason) {
      lines.push(`  Deferral Reason: ${goal.deferralReason}`);
    }

    lines.push(
      '',
      '  DESCRIPTION',
      `    ${goal.description.slice(0, 54)}`
    );

    if (goal.completionCriteria.length > 0) {
      lines.push('', '  COMPLETION CRITERIA');
      goal.completionCriteria.forEach((c, i) => {
        const status = c.completed ? '✓' : '○';
        lines.push(`    ${status} ${c.description.slice(0, 50)}`);
      });
    }

    if (goal.relatedSessions.length > 0) {
      lines.push('', `  Related Sessions: ${goal.relatedSessions.length}`);
    }

    lines.push(`╚${'═'.repeat(58)}╝`);
    return lines.join('\n');
  }
}

// Export singleton
export const goalManager = new GoalManager();
export default goalManager;
