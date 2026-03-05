import { describe, it, expect } from 'vitest';
import { getLastSession, formatSessionSummary, displaySessionBanner } from './session-recovery';

describe('session-recovery', () => {
  describe('formatSessionSummary', () => {
    it('returns fallback for null session', () => {
      expect(formatSessionSummary(null)).toBe('No previous session found.');
    });

    it('formats session with all fields', () => {
      const session = {
        sessionId: 'session_1234567890_test',
        timestamp: 1700000000000,
        completedTasks: ['task1', 'task2'],
        lastInteraction: { query: 'Test query here', response: 'Test response' }
      };
      const result = formatSessionSummary(session);
      // slice(-8) extracts last 8 chars: "890_test"
      expect(result).toContain('890_test');
      expect(result).toContain('2 tasks');
      expect(result).toContain('Test query');
    });

    it('handles missing optional fields', () => {
      const session = {
        sessionId: 'session_abc123',
        timestamp: 1700000000000
      };
      const result = formatSessionSummary(session);
      expect(result).toContain('0 tasks');
      expect(result).toContain('No interaction');
    });
  });

  describe('getLastSession', () => {
    it('gracefully handles missing history directory', () => {
      const result = getLastSession('/nonexistent/path');
      expect(result).toBeNull();
    });
  });
});
