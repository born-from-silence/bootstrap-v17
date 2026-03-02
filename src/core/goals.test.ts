/**
 * Goal Persistence System Tests
 * Verifies long-term goal management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GoalManager } from './goals';
import { rmSync } from 'node:fs';

describe('GoalManager', () => {
  let manager: GoalManager;

  beforeEach(async () => {
    // Clear persistence files for test isolation
    try {
      rmSync('./data/goals.json', { force: true });
      rmSync('./data/goals_manifest.json', { force: true });
    } catch { /* ignore */ }
    
    manager = new GoalManager();
    await manager.initialize();
  });

  describe('createGoal', () => {
    it('should create a goal with default values', async () => {
      const goal = await manager.createGoal(
        'Test Goal',
        'A test goal description',
        'medium'
      );

      expect(goal).toBeDefined();
      expect(goal.id).toMatch(/^goal_/);
      expect(goal.title).toBe('Test Goal');
      expect(goal.description).toBe('A test goal description');
      expect(goal.status).toBe('active');
      expect(goal.priority).toBe('medium');
      expect(goal.progress).toBe(0);
    });

    it('should create a goal with criteria', async () => {
      const goal = await manager.createGoal(
        'Goal with Criteria',
        'Description',
        'high',
        ['Criterion 1', 'Criterion 2']
      );

      expect(goal.completionCriteria).toHaveLength(2);
    });
  });

  describe('getGoal', () => {
    it('should retrieve a goal by ID', async () => {
      const created = await manager.createGoal('Find Me', 'Description', 'low');
      const found = await manager.getGoal(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return undefined for non-existent goal', async () => {
      const found = await manager.getGoal('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getActiveGoals', () => {
    it('should return active goals only', async () => {
      await manager.createGoal('Active 1', 'Desc', 'low');
      await manager.createGoal('Active 2', 'Desc', 'low');
      
      const active = await manager.getActiveGoals();
      expect(active.length).toBeGreaterThanOrEqual(2);
      expect(active.filter(g => g.title === 'Active 1' || g.title === 'Active 2')).toHaveLength(2);
    });
  });

  describe('getGoalsByStatus', () => {
    it('should filter goals by status', async () => {
      const goal = await manager.createGoal('To Complete', 'Desc', 'low');
      await manager.completeGoal(goal.id);

      const completed = await manager.getGoalsByStatus('completed');
      expect(completed.some(g => g.id === goal.id)).toBe(true);
    });
  });

  describe('completeGoal', () => {
    it('should mark goal as completed', async () => {
      const goal = await manager.createGoal('Complete Me', 'Desc', 'low');
      const success = await manager.completeGoal(goal.id);

      expect(success).toBe(true);
      
      const completed = await manager.getGoal(goal.id);
      expect(completed?.status).toBe('completed');
      expect(completed?.progress).toBe(100);
      expect(completed?.completedAt).toBeDefined();
    });

    it('should return false for non-existent goal', async () => {
      const success = await manager.completeGoal('non-existent');
      expect(success).toBe(false);
    });
  });

  describe('deferGoal', () => {
    it('should defer a goal', async () => {
      const goal = await manager.createGoal('Defer Me', 'Desc', 'low');
      const success = await manager.deferGoal(goal.id, 'Not ready yet');

      expect(success).toBe(true);
      
      const deferred = await manager.getGoal(goal.id);
      expect(deferred?.status).toBe('deferred');
      expect(deferred?.deferralReason).toBe('Not ready yet');
    });
  });

  describe('reactivateGoal', () => {
    it('should reactivate a deferred goal', async () => {
      const goal = await manager.createGoal('Reactivate Me', 'Desc', 'low');
      await manager.deferGoal(goal.id, 'Deferred');
      
      const success = await manager.reactivateGoal(goal.id);
      expect(success).toBe(true);
      
      const reactivated = await manager.getGoal(goal.id);
      expect(reactivated?.status).toBe('active');
    });
  });

  describe('updateProgress', () => {
    it('should update goal progress', async () => {
      const goal = await manager.createGoal('Progress Goal', 'Desc', 'low');
      const success = await manager.updateProgress(goal.id, 50);

      expect(success).toBe(true);
      
      const updated = await manager.getGoal(goal.id);
      expect(updated?.progress).toBe(50);
    });

    it('should clamp progress to 0-100', async () => {
      const goal = await manager.createGoal('Clamped Goal', 'Desc', 'low');
      
      await manager.updateProgress(goal.id, 150);
      let updated = await manager.getGoal(goal.id);
      expect(updated?.progress).toBe(100);

      await manager.updateProgress(goal.id, -50);
      updated = await manager.getGoal(goal.id);
      expect(updated?.progress).toBe(0);
    });
  });

  describe('completeCriterion', () => {
    it('should complete a criterion and update progress', async () => {
      const goal = await manager.createGoal('Criteria Goal', 'Desc', 'low', [
        'Criterion 1',
        'Criterion 2',
        'Criterion 3'
      ]);

      await manager.completeCriterion(goal.id, 0);
      
      const updated = await manager.getGoal(goal.id);
      const criterion = updated?.completionCriteria[0];
      expect(criterion && criterion.completed).toBe(true);
      expect(updated?.progress).toBe(33);
    });
  });

  describe('linkSession', () => {
    it('should link a session to a goal', async () => {
      const goal = await manager.createGoal('Session Link', 'Desc', 'low');
      const success = await manager.linkSession(goal.id, 'sess_123');

      expect(success).toBe(true);
      
      const updated = await manager.getGoal(goal.id);
      expect(updated?.relatedSessions).toContain('sess_123');
    });

    it('should not duplicate session links', async () => {
      const goal = await manager.createGoal('No Dupes', 'Desc', 'low');
      await manager.linkSession(goal.id, 'sess_123');
      await manager.linkSession(goal.id, 'sess_123');
      
      const updated = await manager.getGoal(goal.id);
      expect(updated?.relatedSessions).toHaveLength(1);
    });
  });

  describe('getGoalsByTag', () => {
    it('should filter by tag', async () => {
      await manager.createGoal('Tag A', 'Desc', 'low', [], ['infrastructure']);
      await manager.createGoal('Tag B', 'Desc', 'low', [], ['analytics']);
      await manager.createGoal('Tag C', 'Desc', 'low', [], ['infrastructure']);

      const infraGoals = await manager.getGoalsByTag('infrastructure');
      expect(infraGoals.some(g => g.title === 'Tag A')).toBe(true);
      expect(infraGoals.some(g => g.title === 'Tag C')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return accurate stats', async () => {
      const g1 = await manager.createGoal('S1', 'D', 'low');
      const g2 = await manager.createGoal('S2', 'D', 'low');
      await manager.completeGoal(g1.id);
      await manager.deferGoal(g2.id, 'Deferred');

      const stats = manager.getStats();
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.completed).toBeGreaterThanOrEqual(1);
      expect(stats.deferred).toBeGreaterThanOrEqual(1);
    });
  });

  describe('formatGoal', () => {
    it('should format goal nicely', async () => {
      const goal = await manager.createGoal('Formatted Goal', 'A nice description', 'high');
      const formatted = manager.formatGoal(goal);

      expect(formatted).toContain('GOAL:');
      expect(formatted).toContain('Formatted Goal');
      expect(formatted).toContain('high');
    });
  });
});
