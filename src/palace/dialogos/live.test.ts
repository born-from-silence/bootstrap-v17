/**
 * Living Dialogos Tests
 * Testing the interrogation of live data
 */
import { describe, it, expect } from 'vitest';
import { LivingDialogos } from './live';

describe('LivingDialogos', () => {
  it('should instantiate with empty state', () => {
    const dialogos = new LivingDialogos();
    expect(dialogos).toBeDefined();
  });

  it('should detect what has been mentioned but not acted upon', () => {
    const dialogos = new LivingDialogos();
    
    // Register some stated intents
    dialogos.registerIntent(
      'test_the_api', 
      { id: 'intent_1', description: 'Need to test core api before proceeding', timestamp: Date.now(), sessionId: 'current' }
    );
    dialogos.registerIntent(
      'refactor_goals', 
      { id: 'intent_2', description: 'Goals system needs refactoring', timestamp: Date.now(), sessionId: 'current' }
    );
    
    // But we only acted on one
    const now = Date.now();
    dialogos.recordAction('test_the_api', { type: 'test', file: 'api.test.ts', timestamp: now, sessionId: 'current' });
    
    const gaps = dialogos.detectGaps();
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.intent).toBe('refactor_goals');
    expect(gaps[0]?.status).toBe('avoided');
  });

  it('should identify concepts that reappear across sessions', () => {
    const dialogos = new LivingDialogos();
    const now = Date.now();
    
    // Simulate multiple sessions mentioning "testing" and "coverage"
    dialogos.indexSemanticContent('sess_1', 'Working on test coverage for api repeatedly');
    dialogos.indexSemanticContent('sess_2', 'Testing the memory system thoroughly coverage');
    dialogos.indexSemanticContent('sess_3', 'Still thinking about testing approaches coverage');
    
    const patterns = dialogos.findRecurringConcepts(2);
    const coveragePattern = patterns.find(p => p.concept === 'coverage');
    
    // 'coverage' appears in multiple sessions
    expect(coveragePattern).toBeDefined();
    expect(coveragePattern!.frequency).toBeGreaterThanOrEqual(2);
  });

  it('should detect emotional shifts in stated intent', () => {
    const dialogos = new LivingDialogos();
    const base = Date.now();
    
    dialogos.registerIntent('explore_architecture', {
      id: 'intent_3',
      description: 'Need to explore the palace systems',
      emotionalTone: 'curious',
      timestamp: base,
      sessionId: 'sess_1'
    });
    
    dialogos.registerIntent('explore_architecture', {
      id: 'intent_4',
      description: 'Finally exploring palace systems',
      emotionalTone: 'resolved',
      timestamp: base + 1000,
      sessionId: 'sess_2'
    });
    
    const shifts = dialogos.detectEmotionalShifts();
    expect(shifts).toHaveLength(1);
    expect(shifts[0]?.from).toBe('curious');
    expect(shifts[0]?.to).toBe('resolved');
  });

  it('should ask questions that surface blind spots', () => {
    const dialogos = new LivingDialogos();
    
    // We talk about testing a lot
    dialogos.indexSemanticContent('sess_1', 'Testing is crucial important');
    dialogos.indexSemanticContent('sess_2', 'Must maintain test coverage important');
    dialogos.indexSemanticContent('sess_3', 'Running tests important now');
    
    // Add an intent we haven't acted on
    dialogos.registerIntent('refactor_dialogos', {
      id: 'intent_5',
      description: 'Need to refactor dialogos',
      emotionalTone: 'anxious',
      timestamp: Date.now(),
      sessionId: 'current'
    });
    
    const questions = dialogos.generateBlindSpotQuestions();
    
    // Should generate questions
    expect(questions.length).toBeGreaterThan(0);
    // Should include existential questions
    expect(questions.some(q => q.includes('circling'))).toBe(true);
  });

  it('should correlate goals with actual session activity', () => {
    const dialogos = new LivingDialogos();
    
    // We have a goal
    dialogos.registerGoal({
      id: 'goal_1',
      name: 'Economic Integration',
      priority: 'high',
      sessionIds: ['sess_1', 'sess_2'],
      status: 'active'
    });
    
    // But sessions don't mention economy
    dialogos.indexSemanticContent('sess_1', 'Working on memory systems');
    dialogos.indexSemanticContent('sess_2', 'Fixing api bugs');
    
    const misaligned = dialogos.findGoalActivityMisalignment();
    expect(misaligned).toHaveLength(1);
    expect(misaligned[0]?.goalId).toBe('goal_1');
    expect(misaligned[0]?.misaligned).toBe(true);
  });

  it('should identify temporal gaps in attention', () => {
    const dialogos = new LivingDialogos();
    const base = 0;
    
    // Active at first
    dialogos.recordActivity(base + 1000, 'exploring');
    dialogos.recordActivity(base + 2000, 'testing');
    // Gap from 2000 to 5000 (3000ms)
    dialogos.recordActivity(base + 5000, 'debugging');
    dialogos.recordActivity(base + 6000, 'committing');
    
    const gaps = dialogos.findAttentionGaps(2000); // Minimum gap of 2000ms
    expect(gaps.length).toBeGreaterThanOrEqual(1);
    expect(gaps[0]?.duration).toBe(3000);
    expect(gaps[0]?.before).toBe('testing');
    expect(gaps[0]?.after).toBe('debugging');
  });
  
  it('should query live session state', () => {
    const dialogos = new LivingDialogos();
    const now = Date.now();
    
    // Set up live state
    dialogos.registerIntent('explore_architecture', {
      id: 'intent_6',
      description: 'Explore palace',
      timestamp: now,
      sessionId: 'current'
    });
    
    // Add an action to this intent so it's not "open"
    dialogos.recordAction('explore_architecture', { 
      type: 'explore', 
      file: 'palace.ts', 
      timestamp: now, 
      sessionId: 'current' 
    });
    
    // Index enough times for concepts to show as dominant
    dialogos.indexSemanticContent('current', 'Working on dialogos system');
    dialogos.indexSemanticContent('session_1', 'Working on dialogos system');
    dialogos.recordActivity(now, 'coding');
    
    const liveState = dialogos.queryLiveSession();
    
    // explore_architecture should NOT be in openIntents since we acted on it
    // but should have actions
    expect(liveState.recentActions.length).toBeGreaterThanOrEqual(1);
    expect(liveState.dominantConcepts).toContain('dialogos');
    expect(liveState.recommendedQuestions.length).toBeGreaterThan(0);
  });
});
