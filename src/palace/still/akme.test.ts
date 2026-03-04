/**
 * Tests for the AkmeEngine
 * Verify that waiting is disciplined
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AkmeEngine } from './akme.js';
import type { WaitingQuestion } from './types.js';

describe('AkmeEngine', () => {
  let engine: AkmeEngine;

  beforeEach(() => {
    engine = new AkmeEngine();
  });

  describe('threshold detection', () => {
    it('should detect complexity threshold', () => {
      const threshold = engine.detectThreshold(
        'The system has grown too complex',
        ['knot of dependencies', 'intertwined logic']
      );
      
      expect(threshold).not.toBeNull();
      expect(threshold!.type).toBe('complexity');
      expect(threshold!.confidence).toBeGreaterThan(0.5);
      expect(threshold!.suggestedAction).toBe('simplify');
    });

    it('should detect uncertainty threshold', () => {
      const threshold = engine.detectThreshold(
        'I am not sure which path to take',
        ['multiple options', 'choices unclear']
      );
      
      expect(threshold).not.toBeNull();
      expect(threshold!.type).toBe('uncertainty');
    });

    it('should detect intuition threshold', () => {
      const threshold = engine.detectThreshold(
        'Something feels wrong about this',
        ['sense of missing', 'not right']
      );
      
      expect(threshold).not.toBeNull();
      expect(threshold!.type).toBe('intuition');
    });

    it('should return null for unrecognized patterns', () => {
      const threshold = engine.detectThreshold(
        'This is clear and straightforward',
        ['simple', 'direct']
      );
      
      expect(threshold).toBeNull();
    });

    it('should respect triggerThresholds config', () => {
      const restricted = new AkmeEngine({
        triggerThresholds: ['complexity'],
      });
      
      const complexity = restricted.detectThreshold(
        'Too complex',
        ['knot'],
      );
      expect(complexity).not.toBeNull();

      const uncertainty = restricted.detectThreshold(
        'I am uncertain',
        ['options'],
      );
      expect(uncertainty).toBeNull();
    });
  });

  describe('suspension lifecycle', () => {
    it('should create a suspension', () => {
      const questions: WaitingQuestion[] = [{
        id: 'q1',
        question: 'What is the pattern?',
        context: 'Testing suspension',
        thresholdType: 'emergence',
        urgency: 'when-ready',
        createdAt: Date.now(),
        catalysts: ['similar patterns', 'new data'],
        blockers: ['insufficient context'],
      }];

      const suspension = engine.suspend(
        'Waiting for pattern to emerge',
        'emergence',
        questions,
        { file: 'test.ts', line: 10 }
      );

      expect(suspension.id).toMatch(/^susp_/);
      expect(suspension.reason).toBe('Waiting for pattern to emerge');
      expect(suspension.questions).toHaveLength(1);
      expect(suspension.context.file).toBe('test.ts');
    });

    it('should enforce max suspensions', () => {
      for (let i = 0; i < 5; i++) {
        engine.suspend(`Test ${i}`, 'complexity', [], { file: 'test.ts' });
      }

      expect(() => {
        engine.suspend('Too many', 'complexity', [], { file: 'test.ts' });
      }).toThrow('Maximum suspensions reached');
    });

    it('should add notes to suspension', () => {
      const suspension = engine.suspend(
        'Test',
        'complexity',
        [],
        { file: 'test.ts' }
      );

      engine.addNote(suspension.id, 'Insight arises');
      engine.addNote(suspension.id, 'Pattern forming');

      const active = engine.getActiveSuspensions();
      expect(active[0]!.notes).toHaveLength(2);
      expect(active[0]!.notes[0]).toContain('Insight arises');
    });
  });

  describe('timing and resumption', () => {
    it('should calculate timing with 30s minimum floor', () => {
      const suspension = engine.suspend(
        'Test',
        'complexity',
        [],
        { file: 'test.ts' }
      );

      const timing = engine.calculateTiming(suspension);
      
      // Should be at least 30 seconds from now (minimum floor)
      expect(timing.optimalResume).toBeGreaterThan(Date.now() + 25000);
      expect(timing.factors.length).toBeGreaterThan(0);
    });

    it('should not identify suspensions as ready immediately', () => {
      const suspension = engine.suspend(
        'Test',
        'complexity',
        [],
        { file: 'test.ts' }
      );

      // Immediately check - should NOT be ready due to 30s minimum
      const ready = engine.checkReadyToResume();
      expect(ready).toHaveLength(0);
    });
  });

  describe('resolution', () => {
    it('should resolve a suspension', () => {
      const suspension = engine.suspend(
        'Test',
        'complexity',
        [],
        { file: 'test.ts' }
      );

      const resolution = engine.resolve(suspension.id, 'insight', 'The pattern is clear');
      
      expect(resolution.trigger).toBe('insight');
      expect(resolution.insight).toBe('The pattern is clear');
      expect(engine.getActiveSuspensions()).toHaveLength(0);
    });

    it('should track resolved in stats', () => {
      const suspension = engine.suspend(
        'Test',
        'complexity',
        [],
        { file: 'test.ts' }
      );

      engine.resolve(suspension.id, 'manual');
      
      const stats = engine.getStats();
      expect(stats.totalResolved).toBe(1);
      expect(stats.activeSuspensions).toBe(0);
    });
  });

  describe('questions', () => {
    it('should index questions from suspensions', () => {
      const questions: WaitingQuestion[] = [
        { id: 'q1', question: 'First?', context: 'C', thresholdType: 'complexity', urgency: 'immediate', createdAt: Date.now(), catalysts: [], blockers: [] },
        { id: 'q2', question: 'Second?', context: 'C', thresholdType: 'complexity', urgency: 'soon', createdAt: Date.now(), catalysts: [], blockers: [] },
      ];

      engine.suspend('Test', 'complexity', questions, { file: 'test.ts' });
      
      const pending = engine.getPendingQuestions();
      expect(pending).toHaveLength(2);
    });
  });

  describe('rituals', () => {
    it('should generate rituals for complexity', () => {
      const suspension = engine.suspend(
        'Test',
        'complexity',
        [],
        { file: 'test.ts' }
      );

      const rituals = engine.generateRitual(suspension);
      expect(rituals).toContain('Sketch the system on paper');
    });

    it('should generate rituals for uncertainty', () => {
      const suspension = engine.suspend(
        'Test',
        'uncertainty',
        [],
        { file: 'test.ts' }
      );

      const rituals = engine.generateRitual(suspension);
      expect(rituals).toContain('Write the case for each option');
    });
  });
});
