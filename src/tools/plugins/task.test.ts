import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { taskPlugin } from './task';
import { tasks } from '../../task_tracker';
import * as fs from 'fs';
import * as path from 'path';

describe('Task Plugin', () => {
  const trackCreatedTasks: string[] = [];

  beforeEach(() => {
    // Clear all tasks
    for (const task of tasks.getAllTasks()) {
      tasks.deleteTask(task.id);
    }
    trackCreatedTasks.length = 0;
  });

  afterAll(() => {
    // Cleanup
    for (const task of tasks.getAllTasks()) {
      tasks.deleteTask(task.id);
    }
  });

  describe('create', () => {
    it('should create a task', async () => {
      const result = await taskPlugin.execute({
        action: 'create',
        title: 'Test Task',
        description: 'Test Description',
        priority: 'high',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.task.title).toBe('Test Task');
      expect(parsed.task.priority).toBe('high');
      
      if (parsed.taskId) trackCreatedTasks.push(parsed.taskId);
    });

    it('should fail without title', async () => {
      const result = await taskPlugin.execute({
        action: 'create',
        description: 'No title',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('Title is required');
    });

    it('should create task with tags', async () => {
      const result = await taskPlugin.execute({
        action: 'create',
        title: 'Tagged Task',
        tags: ['urgent', 'refactor'],
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.task.tags).toContain('urgent');
    });
  });

  describe('list', () => {
    it('should list tasks', async () => {
      // Create a task first
      const createResult = await taskPlugin.execute({
        action: 'create',
        title: 'Listable Task',
      });
      const createParsed = JSON.parse(createResult);
      
      const result = await taskPlugin.execute({
        action: 'list',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.stats.total).toBeGreaterThan(0);
      expect(parsed.tasks.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const result = await taskPlugin.execute({
        action: 'list',
        status_filter: 'pending',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('should start a task', async () => {
      const createResult = await taskPlugin.execute({
        action: 'create',
        title: 'Startable Task',
      });
      const { taskId } = JSON.parse(createResult);

      const result = await taskPlugin.execute({
        action: 'start',
        task_id: taskId,
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.task.status).toBe('active');
    });

    it('should complete a task', async () => {
      const createResult = await taskPlugin.execute({
        action: 'create',
        title: 'Completable Task',
      });
      const { taskId } = JSON.parse(createResult);

      // Start it first
      await taskPlugin.execute({ action: 'start', task_id: taskId });

      const result = await taskPlugin.execute({
        action: 'complete',
        task_id: taskId,
        note: 'Done!',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.task.status).toBe('completed');
    });

    it('should cancel a task', async () => {
      const createResult = await taskPlugin.execute({
        action: 'create',
        title: 'Cancellable Task',
      });
      const { taskId } = JSON.parse(createResult);

      const result = await taskPlugin.execute({
        action: 'cancel',
        task_id: taskId,
        note: 'No longer needed',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.task.status).toBe('canceled');
    });

    it('should defer a task', async () => {
      const createResult = await taskPlugin.execute({
        action: 'create',
        title: 'Deferrable Task',
      });
      const { taskId } = JSON.parse(createResult);

      const result = await taskPlugin.execute({
        action: 'defer',
        task_id: taskId,
        note: 'Until tomorrow',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.task.status).toBe('deferred');
    });
  });

  describe('notes and tags', () => {
    it('should add a note', async () => {
      const createResult = await taskPlugin.execute({
        action: 'create',
        title: 'Notable Task',
      });
      const { taskId } = JSON.parse(createResult);

      const result = await taskPlugin.execute({
        action: 'add_note',
        task_id: taskId,
        note: 'Important update',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.task.notes.length).toBeGreaterThan(0);
    });

    it('should add a tag', async () => {
      const createResult = await taskPlugin.execute({
        action: 'create',
        title: 'Taggable Task',
      });
      const { taskId } = JSON.parse(createResult);

      const result = await taskPlugin.execute({
        action: 'add_tag',
        task_id: taskId,
        tag: 'important',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.task.tags).toContain('important');
    });
  });

  describe('subtasks', () => {
    it('should create a subtask', async () => {
      const createResult = await taskPlugin.execute({
        action: 'create',
        title: 'Parent Task',
      });
      const { taskId: parentId } = JSON.parse(createResult);

      const result = await taskPlugin.execute({
        action: 'add_subtask',
        task_id: parentId,
        title: 'Child Task',
        description: 'Subtask',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.task.title).toBe('Child Task');
    });
  });

  describe('stats', () => {
    it('should get statistics', async () => {
      const result = await taskPlugin.execute({
        action: 'get_stats',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.stats).toBeDefined();
      expect(typeof parsed.stats.total).toBe('number');
    });
  });

  describe('get_by_tag', () => {
    it('should find tasks by tag', async () => {
      await taskPlugin.execute({
        action: 'create',
        title: 'Critical Task 1',
        tags: ['critical'],
      });
      await taskPlugin.execute({
        action: 'create',
        title: 'Critical Task 2',
        tags: ['critical'],
      });

      const result = await taskPlugin.execute({
        action: 'get_by_tag',
        tag: 'critical',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail without tag', async () => {
      const result = await taskPlugin.execute({
        action: 'get_by_tag',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a task', async () => {
      const createResult = await taskPlugin.execute({
        action: 'create',
        title: 'Deletable Task',
      });
      const { taskId } = JSON.parse(createResult);

      const result = await taskPlugin.execute({
        action: 'delete',
        task_id: taskId,
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle unknown action', async () => {
      const result = await taskPlugin.execute({
        action: 'invalid_action',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('Unknown action');
    });

    it('should handle missing task_id', async () => {
      const result = await taskPlugin.execute({
        action: 'start',
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('task_id is required');
    });
  });
});
