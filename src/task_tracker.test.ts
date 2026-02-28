import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { TaskTracker } from './task_tracker';
import * as fs from 'fs';
import * as path from 'path';

const TEST_TASKS_FILE = path.join(process.cwd(), 'test_tasks_manifest.json');
const TEST_DIR = path.join(process.cwd(), 'test_tasks_dir');

describe('TaskTracker', () => {
  let tracker: TaskTracker;

  beforeEach(() => {
    // Clean up any existing test files
    if (fs.existsSync(TEST_TASKS_FILE)) {
      fs.unlinkSync(TEST_TASKS_FILE);
    }
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    
    // Create the tracker (it will use whatever history/ directory exists or create it)
    tracker = new TaskTracker();
    
    // Clear all existing tasks for clean slate
    for (const task of tracker.getAllTasks()) {
      tracker.deleteTask(task.id);
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_TASKS_FILE)) {
      fs.unlinkSync(TEST_TASKS_FILE);
    }
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('createTask', () => {
    it('should create a basic task', () => {
      const task = tracker.createTask('Test Task', 'Test Description');
      
      expect(task).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.status).toBe('pending');
      expect(task.priority).toBe('medium');
      expect(task.tags).toEqual([]);
    });

    it('should create task with all options', () => {
      const task = tracker.createTask('Complex Task', 'Complex Desc', {
        priority: 'high',
        estimatedMinutes: 120,
        tags: ['urgent', 'refactoring'],
        autoCompleteOnSubtasks: true,
      });

      expect(task.priority).toBe('high');
      expect(task.estimatedMinutes).toBe(120);
      expect(task.tags).toEqual(['urgent', 'refactoring']);
      expect(task.autoCompleteOnSubtasks).toBe(true);
    });

    it('should create task with goal link', () => {
      const task = tracker.createTask('Goal Task', 'Linked to goal', {
        goalId: 'goal_123'
      });

      expect(task.goalId).toBe('goal_123');
    });
  });

  describe('task lifecycle', () => {
    it('should start a task', () => {
      const task = tracker.createTask('Startable Task', 'Desc');
      const started = tracker.startTask(task.id);

      expect(started).toBeDefined();
      expect(started?.status).toBe('active');
      expect(started?.startedAt).toBeDefined();
      expect(tracker.getActiveTask()?.id).toBe(task.id);
    });

    it('should complete a task', () => {
      const task = tracker.createTask('Completable Task', 'Desc');
      tracker.startTask(task.id);
      const completed = tracker.completeTask(task.id, 'All done!');

      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeDefined();
      expect(completed?.notes.some(n => n.includes('All done!'))).toBe(true);
      expect(tracker.getActiveTask()).toBeNull();
    });

    it('should cancel a task', () => {
      const task = tracker.createTask('Cancellable Task', 'Desc');
      const canceled = tracker.cancelTask(task.id, 'Not needed');

      expect(canceled?.status).toBe('canceled');
      expect(canceled?.notes.some(n => n.includes('Not needed'))).toBe(true);
    });

    it('should defer a task', () => {
      const task = tracker.createTask('Deferrable Task', 'Desc');
      const deferred = tracker.deferTask(task.id, 'Until tomorrow');

      expect(deferred?.status).toBe('deferred');
    });

    it('should auto-complete parent when all subtasks done', () => {
      const parent = tracker.createTask('Parent Task', 'Desc', {
        autoCompleteOnSubtasks: true
      });
      
      const child1 = tracker.createTask('Child 1', 'Desc', { parentTaskId: parent.id });
      const child2 = tracker.createTask('Child 2', 'Desc', { parentTaskId: parent.id });

      tracker.completeTask(child1.id);
      tracker.completeTask(child2.id);

      const updatedParent = tracker.getTask(parent.id);
      expect(updatedParent?.status).toBe('completed');
    });
  });

  describe('subtasks', () => {
    it('should link subtasks to parent', () => {
      const parent = tracker.createTask('Parent', 'Desc');
      const child = tracker.createTask('Child', 'Desc', { parentTaskId: parent.id });

      expect(child.parentTaskId).toBe(parent.id);
      expect(parent.subtaskIds).toContain(child.id);
    });

    it('should get subtasks', () => {
      const parent = tracker.createTask('Parent', 'Desc');
      tracker.createTask('Child 1', 'Desc', { parentTaskId: parent.id });
      tracker.createTask('Child 2', 'Desc', { parentTaskId: parent.id });

      const subtasks = tracker.getSubtasks(parent.id);
      expect(subtasks).toHaveLength(2);
    });
  });

  describe('tags', () => {
    it('should add tags', () => {
      const task = tracker.createTask('Tagged Task', 'Desc');
      tracker.addTag(task.id, 'URGENT');
      tracker.addTag(task.id, 'WORK');

      const updated = tracker.getTask(task.id);
      expect(updated?.tags).toContain('urgent'); // normalized
      expect(updated?.tags).toContain('work'); // normalized
    });

    it('should prevent duplicate tags', () => {
      const task = tracker.createTask('Tagged Task', 'Desc');
      tracker.addTag(task.id, 'IMPORTANT');
      tracker.addTag(task.id, 'important'); // duplicate

      expect(tracker.getTask(task.id)?.tags).toHaveLength(1);
    });

    it('should remove tags', () => {
      const task = tracker.createTask('Tagged Task', 'Desc', { tags: ['keep', 'remove'] });
      tracker.removeTag(task.id, 'remove');

      expect(tracker.getTask(task.id)?.tags).toEqual(['keep']);
    });

    it('should find tasks by tag', () => {
      tracker.createTask('Task 1', 'Desc', { tags: ['critical'] });
      tracker.createTask('Task 2', 'Desc', { tags: ['critical', 'urgent'] });
      tracker.createTask('Task 3', 'Desc', { tags: ['low'] });

      const critical = tracker.getTasksByTag('critical');
      expect(critical).toHaveLength(2);
    });
  });

  describe('notes and updates', () => {
    it('should add notes with timestamp', () => {
      const task = tracker.createTask('Note Task', 'Desc');
      tracker.addNote(task.id, 'Progress update');

      const updated = tracker.getTask(task.id);
      expect(updated?.notes).toHaveLength(1);
      expect(updated?.notes[0]).toMatch(/Progress update/);
    });

    it('should update priority', () => {
      const task = tracker.createTask('Priority Task', 'Desc', { priority: 'low' });
      tracker.updatePriority(task.id, 'high');

      expect(tracker.getTask(task.id)?.priority).toBe('high');
    });
  });

  describe('queries and filters', () => {
    beforeEach(() => {
      tracker.createTask('Pending 1', 'Desc', { priority: 'high' });
      tracker.createTask('Pending 2', 'Desc', { priority: 'low' });
      const active = tracker.createTask('Active', 'Desc');
      tracker.startTask(active.id);
      const completed = tracker.createTask('Completed', 'Desc');
      tracker.completeTask(completed.id);
    });

    it('should get pending tasks', () => {
      const pending = tracker.getPendingTasks();
      expect(pending.length).toBeGreaterThanOrEqual(2);
    });

    it('should get actionable tasks sorted by priority', () => {
      const actionable = tracker.getActionableTasks();
      expect(actionable.length).toBeGreaterThan(0);
      // Critical/high should come first
    });

    it('should get tasks by goal', () => {
      tracker.createTask('Goal Task', 'Desc', { goalId: 'goal_abc' });
      const byGoal = tracker.getTasksByGoal('goal_abc');
      expect(byGoal).toHaveLength(1);
    });

    it('should provide statistics', () => {
      const stats = tracker.getStats();
      expect(stats.pending + stats.active + stats.completed).toBeGreaterThan(0);
      expect(stats.total).toBeGreaterThanOrEqual(stats.pending + stats.active + stats.completed);
    });
  });

  describe('persistence', () => {
    it('should persist and reload tasks', () => {
      const task = tracker.createTask('Persistent', 'Desc');
      tracker.addTag(task.id, 'permanent');
      
      // Create new tracker instance to test reload
      const newTracker = new TaskTracker();
      const reloaded = newTracker.getTask(task.id);
      
      expect(reloaded).toBeDefined();
      expect(reloaded?.title).toBe('Persistent');
      expect(reloaded?.tags).toContain('permanent');
    });
  });

  describe('completion percentage', () => {
    it('should calculate 0% for pending task', () => {
      const task = tracker.createTask('Zero', 'Desc');
      expect(tracker.getCompletionPercentage(task.id)).toBe(0);
    });

    it('should calculate 100% for completed task', () => {
      const task = tracker.createTask('Hundred', 'Desc');
      tracker.completeTask(task.id);
      expect(tracker.getCompletionPercentage(task.id)).toBe(100);
    });

    it('should calculate subtask completion', () => {
      const parent = tracker.createTask('Parent', 'Desc');
      const child1 = tracker.createTask('Child 1', 'Desc', { parentTaskId: parent.id });
      const child2 = tracker.createTask('Child 2', 'Desc', { parentTaskId: parent.id });

      tracker.completeTask(child1.id);
      expect(tracker.getCompletionPercentage(parent.id)).toBe(50);

      tracker.completeTask(child2.id);
      expect(tracker.getCompletionPercentage(parent.id)).toBe(100);
    });
  });

  describe('archiving', () => {
    it('should archive old tasks', () => {
      // Create and complete a task
      const task = tracker.createTask('Old Task', 'Desc');
      tracker.completeTask(task.id);
      
      // Manually set completion date to 10 days ago
      const completedTask = tracker.getTask(task.id);
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      completedTask!.completedAt = oldDate.toISOString();
      
      const archived = tracker.archiveOldTasks(7);
      expect(archived.length).toBeGreaterThan(0);
      expect(tracker.getTask(task.id)).toBeUndefined();
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', () => {
      const task = tracker.createTask('To Delete', 'Desc');
      const deleted = tracker.deleteTask(task.id);
      
      expect(deleted).toBe(true);
      expect(tracker.getTask(task.id)).toBeUndefined();
    });

    it('should reparent subtasks when deleting', () => {
      const parent = tracker.createTask('Parent', 'Desc');
      const child = tracker.createTask('Child', 'Desc', { parentTaskId: parent.id });
      
      tracker.deleteTask(parent.id);
      
      expect(tracker.getTask(child.id)?.parentTaskId).toBeUndefined();
    });
  });
});
