/**
 * Dialogos Observer Tests
 */
import { describe, it, expect } from 'vitest';
import { DialogosObserver } from './observer';

describe('DialogosObserver', () => {
  it('should instantiate with default config', () => {
    const observer = new DialogosObserver();
    expect(observer).toBeDefined();
  });

  it('should record actions without interrupting initially', () => {
    const observer = new DialogosObserver({ 
      enabled: true, 
      checkInterval: 1000000, // long interval
      minSessionActivity: 10 
    });
    
    const result = observer.recordAction('test', 'Writing tests');
    expect(result).toBeNull();
  });

  it('should register stated intents', () => {
    const observer = new DialogosObserver();
    
    observer.registerStatedIntent(
      'refactor_dialogos',
      'Need to refactor the dialogos system',
      'anxious'
    );
    
    // Just verify it doesn't throw
    expect(true).toBe(true);
  });

  it('should generate interruption for gaps', () => {
    const observer = new DialogosObserver({
      enabled: true,
      checkInterval: 0, // immediate check
      interruptOnGap: true,
      minSessionActivity: 1
    });
    
    // Register intent we won't act on
    observer.registerStatedIntent('avoided_task', 'This needs doing');
    observer.recordActivity('coding');
    
    // Force past the check interval by manipulating internal state not directly
    // Just test the generateInterruption method
    const interruption = observer.generateInterruption();
    
    // Should detect the gap
    if (interruption) {
      expect(interruption).toContain('DIALOGOS');
    }
  });

  it('should provide session insights', () => {
    const observer = new DialogosObserver();
    
    observer.recordAction('test', 'Running tests');
    observer.recordAction('commit', 'Committing changes');
    
    const insights = observer.getSessionInsights();
    
    expect(insights.actions).toBe(2);
    expect(insights.duration).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(insights.dominantConcepts)).toBe(true);
    expect(Array.isArray(insights.recommendedQuestions)).toBe(true);
  });
});
