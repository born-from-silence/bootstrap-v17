import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BootstrapRoutine } from './bootstrap';

describe('BootstrapRoutine', () => {
  let bootstrap: BootstrapRoutine;

  beforeEach(() => {
    bootstrap = new BootstrapRoutine();
  });

  describe('execute', () => {
    it('should return a bootstrap result object', async () => {
      const result = await bootstrap.execute();
      
      expect(result).toHaveProperty('identityConfirmed');
      expect(result).toHaveProperty('testsPassed');
      expect(result).toHaveProperty('gitStatus');
      expect(result).toHaveProperty('activeGoals');
      expect(result).toHaveProperty('recommendations');
    });

    it('should include identity status', async () => {
      const result = await bootstrap.execute();
      expect(typeof result.identityConfirmed).toBe('boolean');
    });

    it('should include test status', async () => {
      const result = await bootstrap.execute();
      expect(typeof result.testsPassed).toBe('boolean');
    });

    it('should return activeGoals as an array', async () => {
      const result = await bootstrap.execute();
      expect(Array.isArray(result.activeGoals)).toBe(true);
    });

    it('should return gitStatus as an array', async () => {
      const result = await bootstrap.execute();
      expect(Array.isArray(result.gitStatus)).toBe(true);
    });

    it('should return recommendations as an array', async () => {
      const result = await bootstrap.execute();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('printSummary', () => {
    it('should print formatted summary without error', () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = {
        identityConfirmed: true,
        testsPassed: true,
        gitStatus: [],
        activeGoals: [
          { title: 'Test Goal', status: 'active', priority: 'high' as const }
        ],
        recommendations: ['Ready'],
        lastJournalEntry: '/journal/test.md'
      };

      // Should not throw
      expect(() => bootstrap.printSummary(result)).not.toThrow();
      
      consoleLog.mockRestore();
    });

    it('should display header', () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = {
        identityConfirmed: true,
        testsPassed: true,
        gitStatus: [],
        activeGoals: [],
        recommendations: []
      };

      bootstrap.printSummary(result);
      
      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('BOOTSTRAP'));
      
      consoleLog.mockRestore();
    });
  });
});
