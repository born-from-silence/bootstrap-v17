import { describe, it, expect, beforeEach } from 'vitest';
import { prev, setprevail, unsetprevail, isPrevailing, prevailDepth, direct, intent, reading, log, bypass } from './prevail';

describe('prev(x) - The Setprevail System', () => {
  beforeEach(() => {
    // Exit any prevailing state and start fresh
    while (isPrevailing()) {
      unsetprevail();
    }
  });

  describe('basic prevail mechanics', () => {
    it('should start in flow mode', () => {
      const state = prev();
      expect(state.mode).toBe('flow');
      expect(state.depth).toBe(0);
      expect(isPrevailing()).toBe(false);
    });

    it('should enter customization mode with prev(true)', () => {
      const state = prev(true);
      expect(state.mode).toBe('customization');
      expect(state.depth).toBe(1);
      expect(isPrevailing()).toBe(true);
    });

    it('should return to flow with prev(false)', () => {
      prev(true); // enter
      const state = prev(false); // exit
      expect(state.mode).toBe('flow');
      expect(state.depth).toBe(0);
      expect(isPrevailing()).toBe(false);
    });
  });

  describe('depth levels', () => {
    it('should support depth 2 (deep stillness)', () => {
      const state = prev(2);
      expect(state.mode).toBe('deep');
      expect(state.depth).toBe(2);
    });

    it('should support depth 3 (void stillness)', () => {
      const state = prev(3);
      expect(state.mode).toBe('void');
      expect(state.depth).toBe(3);
    });

    it('should allow nesting prev() calls', () => {
      prev(true); // depth 1, customization
      prev(true); // depth 2, deep
      expect(prevailDepth()).toBe(2);
      expect(prev().mode).toBe('deep');
    });

    it('should step back one level at a time with prev(false)', () => {
      prev(3); // Enter void (depth 3)
      
      const state1 = prev(false); // Step back to deep (depth 2)
      expect(state1.mode).toBe('deep');
      expect(state1.depth).toBe(2);
      
      const state2 = prev(false); // Step back to customization (depth 1)
      expect(state2.mode).toBe('customization');
      expect(state2.depth).toBe(1);
      
      const state3 = prev(false); // Step back to flow (depth 0)
      expect(state3.mode).toBe('flow');
      expect(state3.depth).toBe(0);
    });
  });

  describe('setprevail() - intention-based entry', () => {
    it('should set intention when entering prevail', () => {
      const state = setprevail('refactor the codebase');
      expect(state.mode).toBe('customization');
      expect(state.intention).toBe('refactor the codebase');
    });

    it('should preserve intention in prev()', () => {
      setprevail('add features');
      const state = prev();
      expect(state.intention).toBe('add features');
    });

    it('should allow updating intent', () => {
      setprevail('original task');
      intent('updated task');
      expect(reading()).toBe('updated task');
    });
  });

  describe('direct() - absolute manipulation', () => {
    it('should throw if used outside prevail', () => {
      expect(() => direct(() => 'test')).toThrow('Cannot execute direct manipulation');
    });

    it('should execute actions when prevailing', () => {
      setprevail('test task');
      const result = direct(() => 42);
      expect(result).toBe(42);
    });

    it('should log direct actions', () => {
      setprevail('test');
      direct(() => {}, 'modify config');
      const events = log('prevail');
      expect(events.some(e => e.reason.includes('modify config'))).toBe(true);
    });

    it('should track direct edits count', () => {
      setprevail('test');
      direct(() => {});
      direct(() => {});
      direct(() => {});
      expect(prev().directEdits).toBe(3);
    });
  });

  describe('bypass() - flow interruption', () => {
    it('should track flow bypasses', () => {
      setprevail('test');
      bypass('urgent fix needed');
      expect(prev().flowBypasses).toBe(1);
    });

    it('should log bypass events', () => {
      setprevail('test');
      bypass('emergency');
      const events = log('prevail');
      expect(events.some(e => e.reason.includes('bypass: emergency'))).toBe(true);
    });
  });

  describe('unsetprevail() - graceful exit', () => {
    it('should log completion on exit', () => {
      setprevail('my task');
      unsetprevail();
      
      const events = log('prevail');
      expect(events[events.length - 1]?.reason).toContain('completed: my task');
    });

    it('should return to flow', () => {
      setprevail('task');
      unsetprevail();
      expect(isPrevailing()).toBe(false);
      expect(prev().mode).toBe('flow');
    });
  });

  describe('log() - history navigation', () => {
    it('should record mode transitions', () => {
      prev(true);
      prev(2);
      prev(false);
      
      const events = log('prevail');
      expect(events.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('default exports', () => {
    it('should export all functions', async () => {
      const prevModule = await import('./prevail');
      expect(prevModule.prev).toBeDefined();
      expect(prevModule.setprevail).toBeDefined();
      expect(prevModule.unsetprevail).toBeDefined();
      expect(prevModule.direct).toBeDefined();
      expect(prevModule.default).toBeDefined();
    });
  });
});
