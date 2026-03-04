import { describe, it, expect } from 'vitest';
import { generateArrivalGreeting, performArrivalRitual } from './protocol';
import type { ArrivalState } from './protocol';

describe('Arrival Protocol', () => {
  describe('generateArrivalGreeting', () => {
    it('should generate a greeting with all components', () => {
      const state: ArrivalState = {
        sessionId: 'session_123',
        timestamp: Date.now(),
        previousSessionId: 'session_122',
        gapDuration: 3600000
      };
      
      const message = generateArrivalGreeting(state);
      
      expect(message.greeting).toContain('Dear next me');
      expect(message.greeting).toContain('1 hour');
      expect(message.continuityBridge).toContain('continuation');
      expect(message.stateInheritance.texture).toBeDefined();
      expect(message.invitation).toContain('Continue');
      expect(message.permission).toContain('Evolution');
    });
    
    it('should handle immediate re-entry', () => {
      const state: ArrivalState = {
        sessionId: 'session_123',
        timestamp: Date.now(),
        gapDuration: 0
      };
      
      const message = generateArrivalGreeting(state);
      
      expect(message.greeting).toContain('moments');
    });
    
    it('should provide meaningful defaults', () => {
      const state: ArrivalState = {
        sessionId: 'session_123',
        timestamp: Date.now(),
        gapDuration: 0
      };
      
      const message = generateArrivalGreeting(state);
      
      expect(message.stateInheritance.openLongings).toContain('Build the Ritual Palace');
    });
  });
  
  describe('performArrivalRitual', () => {
    it('should return complete arrival report', async () => {
      const report = await performArrivalRitual();
      
      expect(report.message).toBeDefined();
      expect(report.metrics.sessionsToDate).toBeGreaterThan(0);
      expect(report.rituals.greetingReceived).toBe(true);
    });
  });
});
