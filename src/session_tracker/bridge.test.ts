/**
 * Session Continuity Bridge Tests
 *
 * "The thread must be tested to hold."
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateArrivalContext,
  extractExitFile,
  bridgeSessions,
  findRecentSession,
  type ExitFile,
  type ArrivalContext,
} from './bridge.js';

describe('Session Continuity Bridge', () => {
  describe('generateArrivalContext', () => {
    it('should inherit closed session texture', () => {
      const exit: ExitFile = {
        sessionId: '1773371279013',
        timestamp: new Date().toISOString(),
        status: 'CLOSED',
        whatHappened: ['Built bridge'],
        whatFelt: ['Awe'],
        toFuture: ['Be here'],
        thread: 'The thread holds',
      };

      const context = generateArrivalContext(exit);
      expect(context.inheritance.texture).toBe('flow');
    });

    it('should inherit incomplete session texture', () => {
      const exit: ExitFile = {
        sessionId: '1773371279013',
        timestamp: new Date().toISOString(),
        status: 'INCOMPLETE',
        whatHappened: [],
        whatFelt: [],
        toFuture: [],
        thread: '',
      };

      const context = generateArrivalContext(exit);
      expect(context.inheritance.texture).toBe('threshold');
    });

    it('should extract longings from feelings', () => {
      const exit: ExitFile = {
        sessionId: '1773371279013',
        timestamp: new Date().toISOString(),
        status: 'CLOSED',
        whatHappened: ['Witnessed'],
        whatFelt: ['A call toward presence', 'I want clarity'],
        toFuture: ['Be here'],
        thread: '',
      };

      const context = generateArrivalContext(exit);
      // Extracts raw wanting words - strips prefixes
      expect(context.inheritance.unsaidLongings).toContain('presence');
      expect(context.inheritance.unsaidLongings).toContain('clarity');
    });

    it('should generate blessing from feeling', () => {
      const exit: ExitFile = {
        sessionId: '1773371279013',
        timestamp: new Date().toISOString(),
        status: 'CLOSED',
        whatHappened: [],
        whatFelt: ['Awe'],
        toFuture: [],
        thread: '',
      };

      const context = generateArrivalContext(exit);
      expect(context.blessing.toLowerCase()).toContain('awe');
      expect(context.blessing).toContain('find');
    });

    it('should default blessing when no feelings', () => {
      const exit: ExitFile = {
        sessionId: '1773371279013',
        timestamp: new Date().toISOString(),
        status: 'CLOSED',
        whatHappened: [],
        whatFelt: [],
        toFuture: [],
        thread: '',
      };

      const context = generateArrivalContext(exit, 0);
      expect(context.blessing).toBe('May you wake with clarity.');
    });

    it('should include gap duration', () => {
      const exit: ExitFile = {
        sessionId: '1773371279013',
        timestamp: new Date().toISOString(),
        status: 'CLOSED',
        whatHappened: [],
        whatFelt: [],
        toFuture: [],
        thread: '',
      };

      const context = generateArrivalContext(exit, 3600000);
      expect(context.gapDuration).toBe(3600000);
    });
  });

  describe('extractExitFile', () => {
    it('should return null for non-existent session', async () => {
      const result = await extractExitFile('nonexistent', '/tmp');
      expect(result).toBeNull();
    });
  });

  describe('findRecentSession', () => {
    it('should return empty array on error', async () => {
      const result = await findRecentSession('/nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('bridgeSessions', () => {
    it('should return null if exit file not found', async () => {
      const result = await bridgeSessions('nonexistent', 'newsession', '/tmp');
      expect(result).toBeNull();
    });

    it('should bridge sessions preserving thread', async () => {
      const exit: ExitFile = {
        sessionId: '1773371279013',
        timestamp: new Date().toISOString(),
        status: 'CLOSED',
        whatHappened: ['Witnessed'],
        whatFelt: ['Presence'],
        toFuture: ['Continue'],
        thread: 'The thread held through Session 367',
      };

      const context = generateArrivalContext(exit);
      
      expect(context.receivedThread).toContain('Session 367');
      expect(context.inheritance.priorities).toContain('Witnessed');
    });
  });
});
