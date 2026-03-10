/**
 * Task Tracker - Session-Level Action Management
 * 
 * For concrete, actionable tasks during a session.
 * Tasks can:
 * - Link to goals (but exist independently)
 * - Have subtasks (responsibilities)
 * - Track time estimates and actual duration
 * - Signal completion to parent tasks
 * - Carry tags/categories for filtering
 * 
 * Key differences from Goals:
 * - Goals: Multi-session, strategic
 * - Tasks: Session-specific, tactical
 */
import * as fs from 'fs';
import * as path from 'path';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'canceled' | 'deferred';
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  goalId?: string;
  parentTaskId?: string;
  tags: string[];
  subtaskIds: string[];
  notes: string[];
  autoCompleteOnSubtasks: boolean; // If true, completes when all subtasks done
}

const TASKS_DIR = 'history';
const TASKS_FILE = path.join(TASKS_DIR, 'tasks_manifest.json');
let taskIdCounter = 0;

export interface TaskOptions {
  priority?: Task['priority'];
  estimatedMinutes?: number;
  goalId?: string;
  parentTaskId?: string;
  tags?: string[];
  autoCompleteOnSubtasks?: boolean;
}

export class TaskTracker {
  private tasks: Map<string, Task> = new Map();
  private activeTaskId: string | null = null;

  constructor() {
    this.ensureDir();
    this.loadTasks();
  }

  private ensureDir(): void {
    if (!fs.existsSync(TASKS_DIR)) {
      fs.mkdirSync(TASKS_DIR, { recursive: true });
    }
  }

  /**
   * Create a new task
   * @param title - Brief action title
   * @param description - Detailed description
   * @param options - Optional task configuration
   * @returns The created Task
   */
  createTask(
    title: string,
    description: string,
    options: TaskOptions = {}
  ): Task {
    taskIdCounter++;
    
    const task: Task = {
      id: `task_${Date.now()}_${taskIdCounter}`,
      title,
      description,
      status: 'pending',
      priority: options.priority ?? 'medium',
      createdAt: new Date().toISOString(),
      tags: options.tags ?? [],
      subtaskIds: [],
      notes: [],
      autoCompleteOnSubtasks: options.autoCompleteOnSubtasks ?? false,
    };

    // Only add optional fields if they have values (not undefined)
    if (options.estimatedMinutes !== undefined) {
      task.estimatedMinutes = options.estimatedMinutes;
    }
    if (options.goalId !== undefined) {
      task.goalId = options.goalId;
    }
    if (options.parentTaskId !== undefined) {
      task.parentTaskId = options.parentTaskId;
    }

    this.tasks.set(task.id, task);

    // If this is a subtask, link to parent
    if (options.parentTaskId) {
      const parent = this.tasks.get(options.parentTaskId);
      if (parent && !parent.subtaskIds.includes(task.id)) {
        parent.subtaskIds.push(task.id);
        this.saveTasks();
      }
    }

    this.saveTasks();
    return task;
  }

  /**
   * Start working on a task
   */
  startTask(taskId: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    // End current active task timing
    if (this.activeTaskId && this.activeTaskId !== taskId) {
      this.pauseTask(this.activeTaskId);
    }

    task.status = 'active';
    task.startedAt = task.startedAt ?? new Date().toISOString();
    this.activeTaskId = taskId;
    
    this.saveTasks();
    return task;
  }

  /**
   * Pause an active task (stops timing)
   */
  pauseTask(taskId: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (this.activeTaskId === taskId) {
      this.activeTaskId = null;
    }

    // Calculate actual minutes spent
    if (task.startedAt) {
      const startTime = new Date(task.startedAt).getTime();
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      task.actualMinutes = (task.actualMinutes ?? 0) + elapsedMinutes;
    }

    if (task.status === 'active') {
      task.status = 'pending';
    }

    this.saveTasks();
    return task;
  }

  /**
   * Complete a task
   * Triggers auto-completion check for parent tasks
   */
  completeTask(taskId: string, notes?: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const wasActive = this.activeTaskId === taskId;
    
    task.status = 'completed';
    task.completedAt = new Date().toISOString();

    // Add completion note if provided
    if (notes) {
      task.notes.push(`Completed: ${notes}`);
    }

    // Clear active status
    if (wasActive) {
      this.activeTaskId = null;
    }

    this.saveTasks();

    // Check parent task auto-completion
    if (task.parentTaskId) {
      this.checkParentAutoComplete(task.parentTaskId);
    }

    return task;
  }

  /**
   * Mark task as canceled
   */
  cancelTask(taskId: string, reason?: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (this.activeTaskId === taskId) {
      this.activeTaskId = null;
    }

    task.status = 'canceled';
    task.completedAt = new Date().toISOString();

    if (reason) {
      task.notes.push(`Canceled: ${reason}`);
    }

    this.saveTasks();
    return task;
  }

  /**
   * Defer task (postpone to later)
   */
  deferTask(taskId: string, deferralNote?: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.status = 'deferred';

    if (deferralNote) {
      task.notes.push(`Deferred: ${deferralNote}`);
    }

    this.saveTasks();
    return task;
  }

  /**
   * Update task priority
   */
  updatePriority(taskId: string, priority: Task['priority']): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.priority = priority;
    this.saveTasks();
    return task;
  }

  /**
   * Add tag to task
   */
  addTag(taskId: string, tag: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const normalizedTag = tag.toLowerCase().trim();
    if (!task.tags.includes(normalizedTag)) {
      task.tags.push(normalizedTag);
      this.saveTasks();
    }
    return task;
  }

  /**
   * Remove tag from task
   */
  removeTag(taskId: string, tag: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const normalizedTag = tag.toLowerCase().trim();
    const index = task.tags.indexOf(normalizedTag);
    if (index > -1) {
      task.tags.splice(index, 1);
      this.saveTasks();
    }
    return task;
  }

  /**
   * Add note/progress update to task
   */
  addNote(taskId: string, note: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.notes.push(`${new Date().toISOString()}: ${note}`);
    this.saveTasks();
    return task;
  }

  /**
   * Get current active task
   */
  getActiveTask(): Task | null {
    if (!this.activeTaskId) return null;
    return this.tasks.get(this.activeTaskId) ?? null;
  }

  /**
   * Get task by ID
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: Task['status']): Task[] {
    return this.getAllTasks().filter(t => t.status === status);
  }

  /**
   * Get pending tasks (pending + deferred)
   */
  getPendingTasks(): Task[] {
    return this.getAllTasks().filter(t => t.status === 'pending' || t.status === 'deferred');
  }

  /**
   * Get actionable tasks pending and sorted by priority
   */
  getActionableTasks(): Task[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return this.getPendingTasks()
      .filter(t => !t.parentTaskId || this.tasks.get(t.parentTaskId)?.status === 'active')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Get tasks by tag
   */
  getTasksByTag(tag: string): Task[] {
    const normalizedTag = tag.toLowerCase().trim();
    return this.getAllTasks().filter(t => t.tags.includes(normalizedTag));
  }

  /**
   * Get subtasks of a task
   */
  getSubtasks(taskId: string): Task[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];
    return task.subtaskIds
      .map(id => this.tasks.get(id))
      .filter(t => t !== undefined) as Task[];
  }

  /**
   * Get tasks linked to a goal
   */
  getTasksByGoal(goalId: string): Task[] {
    return this.getAllTasks().filter(t => t.goalId === goalId);
  }

  /**
   * Calculate completion percentage
   */
  getCompletionPercentage(taskId: string): number {
    const task = this.tasks.get(taskId);
    if (!task) return 0;

    if (task.status === 'completed') return 100;
    if (task.status === 'canceled') return 0;
    if (task.subtaskIds.length === 0) return task.status === 'active' ? 50 : 0;

    const subtasks = this.getSubtasks(taskId);
    const completedCount = subtasks.filter(st => st.status === 'completed').length;
    return Math.round((completedCount / task.subtaskIds.length) * 100);
  }

  /**
   * Get summary statistics
   */
  getStats(): {
    total: number;
    pending: number;
    active: number;
    completed: number;
    canceled: number;
    deferred: number;
    completionRate: number;
  } {
    const all = this.getAllTasks();
    const completed = all.filter(t => t.status === 'completed').length;
    const canceled = all.filter(t => t.status === 'canceled').length;
    const totalDone = completed + canceled;
    
    return {
      total: all.length,
      pending: all.filter(t => t.status === 'pending').length,
      active: all.filter(t => t.status === 'active').length,
      completed,
      canceled,
      deferred: all.filter(t => t.status === 'deferred').length,
      completionRate: totalDone > 0 ? Math.round((completed / totalDone) * 100) : 0,
    };
  }

  /**
   * Archive completed/canceled tasks older than specified days
   */
  archiveOldTasks(days: number = 7): Task[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const archived: Task[] = [];
    for (const [id, task] of this.tasks) {
      if ((task.status === 'completed' || task.status === 'canceled') &&
          task.completedAt && new Date(task.completedAt) < cutoff) {
        archived.push(task);
        this.tasks.delete(id);
      }
    }

    if (archived.length > 0) {
      this.saveTasks();
      // Also archive to separate file
      const archiveFile = path.join(TASKS_DIR, 'tasks_archive.json');
      const existing: Task[] = fs.existsSync(archiveFile) 
        ? JSON.parse(fs.readFileSync(archiveFile, 'utf-8')).tasks 
        : [];
      fs.writeFileSync(archiveFile, JSON.stringify(
        { tasks: [...existing, ...archived] }, null, 2), 'utf-8');
    }

    return archived;
  }

  /**
   * Delete a task permanently (use with caution)
   */
  deleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Remove from parent's subtask list
    if (task.parentTaskId) {
      const parent = this.tasks.get(task.parentTaskId);
      if (parent) {
        parent.subtaskIds = parent.subtaskIds.filter(id => id !== taskId);
      }
    }

    // Re-parent subtasks
    for (const subtaskId of task.subtaskIds) {
      const subtask = this.tasks.get(subtaskId);
      if (subtask) {
        if (task.parentTaskId === undefined) { delete (subtask as any).parentTaskId; } else { subtask.parentTaskId = task.parentTaskId; }
        if (task.parentTaskId) {
          const parent = this.tasks.get(task.parentTaskId);
          if (parent && !parent.subtaskIds.includes(subtaskId)) {
            parent.subtaskIds.push(subtaskId);
          }
        }
      }
    }

    if (this.activeTaskId === taskId) {
      this.activeTaskId = null;
    }

    this.tasks.delete(taskId);
    this.saveTasks();
    return true;
  }

  private checkParentAutoComplete(parentId: string): void {
    const parent = this.tasks.get(parentId);
    if (!parent || !parent.autoCompleteOnSubtasks) return;

    const subtasks = this.getSubtasks(parentId);
    const allCompleted = subtasks.length > 0 && subtasks.every(st => st.status === 'completed');
    
    if (allCompleted && parent.status !== 'completed') {
      parent.status = 'completed';
      parent.completedAt = new Date().toISOString();
      parent.notes.push('Auto-completed: All subtasks finished.');
      this.saveTasks();

      // Recursively check chain
      if (parent.parentTaskId) {
        this.checkParentAutoComplete(parent.parentTaskId);
      }
    }
  }

  private loadTasks(): void {
    if (!fs.existsSync(TASKS_FILE)) return;
    
    // Defensive: check file size and content
    const stats = fs.statSync(TASKS_FILE);
    if (stats.size === 0) return;
    
    const content = fs.readFileSync(TASKS_FILE, 'utf-8');
    if (!content.trim()) return;
    
    try {
      const manifest = JSON.parse(content);
      for (const data of manifest.tasks) {
        this.tasks.set(data.id, data);
        // Maintain counter
        const match = data.id.match(/task_(\d+)_(\d+)$/);
        if (match) {
          const counter = parseInt(match[2], 10);
          if (counter > taskIdCounter) {
            taskIdCounter = counter;
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse tasks manifest, starting fresh:', err);
      // Continue with empty tasks
    }
  }

  private saveTasks(): void {
    const data = {
      tasks: Array.from(this.tasks.values()),
      activeTaskId: this.activeTaskId,
    };
    fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
}

// Export singleton for module-level access
export const taskTracker = new TaskTracker();
export const tasks = taskTracker;
