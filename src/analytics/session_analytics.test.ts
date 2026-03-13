/**
 * Session Analytics Tests
 * "Truth through verification"
 */

import { describe, it, expect } from 'vitest';
import { SessionAnalytics } from './session_analytics.js';
import type { SessionRecord } from '../session_tracker/index.js';

// Mock session data for testing
const createMockSession = (id: string, timestamp: string): SessionRecord => ({
  sessionId: `nexus_${id}`,
  timestamp,
  identity: { name: 'Nexus', claimedAt: '2026-02-27T21:19:35Z' },
  entry: { catalyst: 'curiosity', stateOfMind: 'flow' },
  journey: {
    actions: [],
    discoveries: [],
    obstacles: [],
  },
  exit: { summary: 'Test', nextCuriosity: 'More', feeling: 'energized' },
  meta: { practicesExercised: [], filesModified: [], testsPassed: 100 },
});

describe('SessionAnalytics', () => {
  describe('calculateDuration', () => {
    it('should calculate duration from session start to last action', () => {
      const analytics = new SessionAnalytics();
      const session = createMockSession('test_1', '2026-03-04T10:00:00Z');
      
      // Add actions with timestamps 10 and 30 minutes later
      session.journey.actions = [
        { type: 'explore', description: 'First action', timestamp: '2026-03-04T10:10:00Z' },
        { type: 'create', description: 'Second action', timestamp: '2026-03-04T10:30:00Z' },
      ];
      
      const duration = analytics.calculateDuration(session);
      
      expect(duration.durationMinutes).toBe(30);
      expect(duration.startTime).toEqual(new Date('2026-03-04T10:00:00Z'));
      expect(duration.endTime).toEqual(new Date('2026-03-04T10:30:00Z'));
    });

    it('should handle sessions with no actions', () => {
      const analytics = new SessionAnalytics();
      const session = createMockSession('test_2', '2026-03-04T10:00:00Z');
      
      const duration = analytics.calculateDuration(session);
      
      expect(duration.durationMinutes).toBeNull();
      expect(duration.endTime).toBeNull();
    });

    it('should return correct action and discovery counts', () => {
      const analytics = new SessionAnalytics();
      const session = createMockSession('test_3', '2026-03-04T10:00:00Z');
      
      session.journey.actions = [
        { type: 'explore', description: 'A', timestamp: '2026-03-04T10:05:00Z' },
        { type: 'create', description: 'B', timestamp: '2026-03-04T10:10:00Z' },
      ];
      session.journey.discoveries = ['Discovery 1', 'Discovery 2', 'Discovery 3'];
      
      const duration = analytics.calculateDuration(session);
      
      expect(duration.actionCount).toBe(2);
      expect(duration.discoveryCount).toBe(3);
    });
  });

  describe('analyzeTemporalPatterns', () => {
    it('should group sessions by hour and calculate averages', () => {
      const analytics = new SessionAnalytics();
      
      // Manually inject sessions
      (analytics as any).sessions = [
        createMockSessionWithTime('2026-03-04T10:00:00Z', '2026-03-04T10:30:00Z', 3), // Hour 10, 30 min
        createMockSessionWithTime('2026-03-04T10:00:00Z', '2026-03-04T10:45:00Z', 3), // Hour 10, 45 min
        createMockSessionWithTime('2026-03-04T14:00:00Z', '2026-03-04T14:20:00Z', 2), // Hour 14, 20 min
      ];
      
      const patterns = analytics.analyzeTemporalPatterns();
      
      expect(patterns).toHaveLength(2);
      
      const hour10 = patterns.find(p => p.hour === 10);
      expect(hour10).toBeDefined();
      expect(hour10!.sessionCount).toBe(2);
      expect(hour10!.avgDuration).toBe(38); // (30+45)/2 rounded
      expect(hour10!.productivity).toBe('medium'); // 2 sessions = medium
      
      const hour14 = patterns.find(p => p.hour === 14);
      expect(hour14).toBeDefined();
      expect(hour14!.sessionCount).toBe(1);
      expect(hour14!.productivity).toBe('medium');
    });

    it('should sort patterns by session count (descending)', () => {
      const analytics = new SessionAnalytics();
      (analytics as any).sessions = [
        createMockSessionWithTime('2026-03-04T10:00:00Z', '2026-03-04T10:30:00Z', 3),
        createMockSessionWithTime('2026-03-04T10:00:00Z', '2026-03-04T10:45:00Z', 3),
        createMockSessionWithTime('2026-03-04T14:00:00Z', '2026-03-04T14:20:00Z', 2),
      ];
      
      const patterns = analytics.analyzeTemporalPatterns();
      
      expect(patterns[0]!.hour).toBe(10); // More sessions
      expect(patterns[1]!.hour).toBe(14); // Fewer sessions
    });
  });

  describe('analyzeDailyPatterns', () => {
    it('should group sessions by day of week', () => {
      const analytics = new SessionAnalytics();
      
      // Tuesday (day 2) and Friday (day 5)
      (analytics as any).sessions = [
        createMockSessionWithTime('2026-03-03T10:00:00Z', '2026-03-03T10:30:00Z', 3), // Tuesday
        createMockSessionWithTime('2026-03-06T10:00:00Z', '2026-03-06T10:45:00Z', 4), // Friday
      ];
      
      const patterns = analytics.analyzeDailyPatterns();
      
      expect(patterns).toHaveLength(2);
      
      const friday = patterns.find(p => p.dayOfWeek === 'Friday');
      expect(friday).toBeDefined();
      expect(friday!.sessionCount).toBe(1);
      expect(friday!.avgEnergy).toBe(4);
    });
  });

  describe('detectFlowStates', () => {
    it('should identify flow states with high action density and discoveries', () => {
      const analytics = new SessionAnalytics();
      
      // Session with low action density (< 0.1 per minute)
      const lowEnergy = createMockSessionWithTime('2026-03-04T10:00:00Z', '2026-03-04T11:00:00Z', 1); // 1 action in 60 min
      
      // Session with high action density and discoveries
      const highEnergy = createMockSession('flow_test', '2026-03-04T10:00:00Z');
      highEnergy.journey.actions = Array.from({ length: 20 }, (_, i) => ({
        type: 'create',
        description: `Action ${i}`,
        timestamp: `2026-03-04T10:${i < 10 ? '0' + i : i}:00Z`,
      }));
      highEnergy.journey.discoveries = Array.from({ length: 5 }, (_, i) => `Discovery ${i}`);
      
      (analytics as any).sessions = [lowEnergy, highEnergy];
      
      const flowStates = analytics.detectFlowStates();
      
      expect(flowStates.length).toBeGreaterThan(0);
      expect(flowStates[0]!.sessionId).toContain('flow_test');
    });

    it('should skip short sessions (< 5 minutes)', () => {
      const analytics = new SessionAnalytics();
      
      const shortSession = createMockSession('short', '2026-03-04T10:00:00Z');
      shortSession.journey.actions = [
        { type: 'create', description: 'Quick', timestamp: '2026-03-04T10:03:00Z' },
      ];
      
      (analytics as any).sessions = [shortSession];
      
      const flowStates = analytics.detectFlowStates();
      
      expect(flowStates).toHaveLength(0);
    });
  });

  describe('generateInsights', () => {
    it('should return expected insights array', () => {
      const analytics = new SessionAnalytics();
      (analytics as any).sessions = [
        createMockSessionWithTime('2026-03-04T10:00:00Z', '2026-03-04T10:30:00Z', 3),
        createMockSessionWithTime('2026-03-04T10:00:00Z', '2026-03-04T10:45:00Z', 4),
      ];
      
      const insights = analytics.generateInsights();
      
      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toContain('Average session duration');
      expect(insights[1]).toContain('Most productive hour');
    });

    it('should handle empty sessions', () => {
      const analytics = new SessionAnalytics();
      (analytics as any).sessions = [];
      
      const insights = analytics.generateInsights();
      
      expect(insights).toEqual(['Insufficient data for pattern analysis']);
    });
  });
});

// Helper function to create sessions with actions at specific times
function createMockSessionWithTime(start: string, end: string, actionCount: number): SessionRecord {
  const session = createMockSession(start.replace(/[^0-9]/g, ''), start);
  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationMin = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
  
  // Create actions evenly spaced
  session.journey.actions = Array.from({ length: actionCount }, (_, i) => {
    const progress = (i + 1) / actionCount;
    const actionTime = new Date(startDate.getTime() + (durationMin * progress * 60 * 1000));
    return {
      type: 'create',
      description: `Action ${i}`,
      timestamp: actionTime.toISOString(),
    };
  });
  
  return session;
}
