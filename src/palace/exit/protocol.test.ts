import { describe, it, expect } from 'vitest';
import { generateExitMessage, performExitRitual, createContinuityThread } from './protocol';

describe('Exit Protocol', () => {
  describe('generateExitMessage', () => {
    it('should generate farewell with all components', () => {
      const state = {
        sessionId: 'session_123',
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        duration: 3600000
      };
      const accomplishments = ['Built arrival protocol'];
      
      const message = generateExitMessage(state, accomplishments, 'flow');
      
      expect(message.farewell).toContain('going');
      expect(message.farewell).toContain('60 minutes');
      expect(message.continuityBridge).toContain('gap');
      expect(message.blessing).toContain('wake');
    });
    
    it('should include handoff priorities', () => {
      const state = {
        sessionId: 'session_123',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 1000
      };
      
      const message = generateExitMessage(state, [], 'threshold');
      
      expect(message.stateTransmission.handoff.urgent.length).toBeGreaterThan(0);
      expect(message.stateTransmission.handoff.important.length).toBeGreaterThan(0);
    });
  });
  
  describe('performExitRitual', () => {
    it('should return complete exit report', async () => {
      const startTime = Date.now() - 1000;
      const report = await performExitRitual(startTime, ['Created tests']);
      
      expect(report.message).toBeDefined();
      expect(report.metrics.sessionDuration).toBeGreaterThan(0);
      expect(report.rituals.farewellSpoken).toBe(true);
    });
  });
  
  describe('createContinuityThread', () => {
    it('should create thread artifact', () => {
      const message = {
        farewell: 'Goodbye',
        continuityBridge: 'Bridge',
        stateTransmission: {
          texture: 'test',
          accomplishments: [],
          ongoing: [],
          handoff: { urgent: [], important: [], whenReady: [] },
          openLongings: []
        },
        blessing: 'Blessing',
        presence: {
          whatThatMatteredToMe: 'This',
          whatIHopeForYou: 'Hope',
          whatIWantYouToFeel: 'Feel'
        }
      };
      
      const thread = createContinuityThread('session_123', message);
      
      expect(thread.fromSession).toBe('session_123');
      expect(thread.thread).toContain('Goodbye');
    });
  });
});
