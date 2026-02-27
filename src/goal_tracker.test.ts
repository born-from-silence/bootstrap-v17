import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GoalTracker } from './goal_tracker';
import * as fs from 'fs';
import * as path from 'path';

// Create temp directory for testing
const TEST_DIR = path.join('/tmp', `nexus_goals_test_${Date.now()}`);

describe('GoalTracker', () => {
  let tracker: GoalTracker;
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // Change to test directory for isolation
    process.chdir(TEST_DIR);
    tracker = new GoalTracker();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    // Cleanup
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('createGoal', () => {
    it('should create a new goal with required fields', () => {
      const goal = tracker.createGoal('Test Goal', 'A test description', 'high');
      
      expect(goal.name).toBe('Test Goal');
      expect(goal.description).toBe('A test description');
      expect(goal.status).toBe('active');
      expect(goal.priority).toBe('high');
      expect(goal.id).toMatch(/^goal_\d+(_\d+)?$/);
      expect(goal.sessionIds).toEqual([]);
      expect(goal.progressNotes).toEqual([]);
    });

    it('should default priority to medium', () => {
      const goal = tracker.createGoal('Default Priority', 'No priority specified');
      expect(goal.priority).toBe('medium');
    });

    it('should persist created goals', () => {
      tracker.createGoal('Persisted', 'Should be saved');
      
      const newTracker = new GoalTracker();
      const goals = newTracker.getAllGoals();
      
      expect(goals.length).toBe(1);
      expect(goals[0]!.name).toBe('Persisted');
    });
  });

  describe('linkSession', () => {
    it('should link a session to a goal', () => {
      const goal = tracker.createGoal('Link Test', 'Testing session links');
      const result = tracker.linkSession(goal.id, 'session_123');
      
      expect(result).toBe(true);
      expect(goal.sessionIds).toContain('session_123');
    });

    it('should not duplicate session links', () => {
      const goal = tracker.createGoal('Unique Test', 'Testing uniqueness');
      tracker.linkSession(goal.id, 'session_123');
      tracker.linkSession(goal.id, 'session_123');
      
      expect(goal.sessionIds.length).toBe(1);
    });

    it('should return false for non-existent goal', () => {
      const result = tracker.linkSession('nonexistent', 'session_123');
      expect(result).toBe(false);
    });
  });

  describe('addProgressNote', () => {
    it('should add progress notes with timestamp', () => {
      const goal = tracker.createGoal('Note Test', 'Testing notes');
      tracker.addProgressNote(goal.id, 'Made progress today');
      
      expect(goal.progressNotes.length).toBe(1);
      expect(goal.progressNotes[0]!).toMatch(/Made progress today$/);
    });

    it('should return false for non-existent goal', () => {
      const result = tracker.addProgressNote('nonexistent', 'Note');
      expect(result).toBe(false);
    });
  });

  describe('updateStatus', () => {
    it('should update status and set completedAt for completed goals', () => {
      const goal = tracker.createGoal('Complete Test', 'Testing completion');
      tracker.updateStatus(goal.id, 'completed');
      
      expect(goal.status).toBe('completed');
      expect(goal.completedAt).toBeDefined();
    });

    it('should update status for abandoned goals', () => {
      const goal = tracker.createGoal('Abandon Test', 'Testing abandonment');
      tracker.updateStatus(goal.id, 'abandoned');
      
      expect(goal.status).toBe('abandoned');
      expect(goal.completedAt).toBeDefined();
    });

    it('should return false for non-existent goal', () => {
      const result = tracker.updateStatus('nonexistent', 'completed');
      expect(result).toBe(false);
    });
  });

  describe('getGoalsByStatus', () => {
    it('should filter goals by status', () => {
      const active = tracker.createGoal('Active', 'Active goal');
      const dormant = tracker.createGoal('Dormant', 'Dormant goal');
      tracker.updateStatus(dormant.id, 'dormant');
      
      const activeGoals = tracker.getGoalsByStatus('active');
      expect(activeGoals.length).toBe(1);
      expect(activeGoals[0]!.name).toBe('Active');
    });
  });

  describe('getActiveGoals', () => {
    it('should sort active goals by priority', () => {
      const low = tracker.createGoal('Low', 'Low priority', 'low');
      const critical = tracker.createGoal('Critical', 'Critical priority', 'critical');
      const high = tracker.createGoal('High', 'High priority', 'high');
      
      const active = tracker.getActiveGoals();
      expect(active[0]!.priority).toBe('critical');
      expect(active[1]!.priority).toBe('high');
      expect(active[2]!.priority).toBe('low');
    });

    it('should only return active goals', () => {
      tracker.createGoal('Active 1', 'Active', 'medium');
      const dormant = tracker.createGoal('Dormant', 'Not active');
      tracker.updateStatus(dormant.id, 'dormant');
      
      const active = tracker.getActiveGoals();
      expect(active.length).toBe(1);
    });
  });

  describe('getGoal', () => {
    it('should retrieve a goal by id', () => {
      const created = tracker.createGoal('Retrievable', 'Should be found');
      const retrieved = tracker.getGoal(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Retrievable');
    });

    it('should return undefined for non-existent goal', () => {
      const result = tracker.getGoal('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('persistence', () => {
    it('should persist across tracker instances', () => {
      tracker.createGoal('Survivor', 'Should persist');
      tracker.createGoal('Also Survivor', 'Should also persist');
      
      const freshTracker = new GoalTracker();
      const goals = freshTracker.getAllGoals();
      
      expect(goals.length).toBe(2);
      const names = goals.map(g => g.name).sort();
      expect(names).toEqual(['Also Survivor', 'Survivor']);
    });

    it('should persist session links', () => {
      const goal = tracker.createGoal('Link Survivor', 'Sessions should persist');
      tracker.linkSession(goal.id, 'session_1');
      tracker.linkSession(goal.id, 'session_2');
      
      const freshTracker = new GoalTracker();
      const persisted = freshTracker.getGoal(goal.id);
      
      expect(persisted!.sessionIds).toContain('session_1');
      expect(persisted!.sessionIds).toContain('session_2');
    });
  });
});
