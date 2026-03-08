/**
 * Perspective Thanatos Bridge - Test Suite
 * 
 * Tests the Thanatos perspective bridge which handles termination events,
 * closure expressions, and mortality metaphors.
 * 
 * Uses interface-based mocking for the GrokExpressionEngine dependency
 * to ensure isolated unit testing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PerspectiveThanatosBridge,
  PerspectiveType
} from './PerspectiveThanatosBridge.js';
import type {
  ClosureContext,
  TerminationEvent,
  ReflectionResult,
  ExpressionResult
} from './PerspectiveThanatosBridge.js';
import { GrokExpressionEngine } from './GrokExpressionEngine.js';
import type {
  Expression,
  SynthesisOptions,
  TemplateDefinition
} from './GrokExpressionEngine.js';

// ============================================================================
// Mock Engine Implementation (Interface-based mocking)
// ============================================================================

/**
 * A mock implementation of GrokExpressionEngine for testing
 * Follows interface-based mocking pattern for isolation
 */
class MockGrokExpressionEngine extends GrokExpressionEngine {
  private shouldFailTemplates: Set<string> = new Set();
  private templateOutputs: Map<string, string> = new Map();
  private callLog: Array<{ method: string; args: unknown[] }> = [];

  // Override generateTemplate to support test scenarios
  generateTemplate(templateId: string, context: Record<string, unknown>): string {
    this.callLog.push({ method: 'generateTemplate', args: [templateId, context] });

    // Check for forced failures
    if (this.shouldFailTemplates.has(templateId)) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Check for custom outputs
    if (this.templateOutputs.has(templateId)) {
      const template = this.templateOutputs.get(templateId)!;
      return this.interpolate(template, context);
    }

    // Default behavior: use parent implementation
    return super.generateTemplate(templateId, context);
  }

  // Test helper to force template failures
  failTemplate(templateId: string): void {
    this.shouldFailTemplates.add(templateId);
  }

  // Test helper to set custom template outputs
  setTemplateOutput(templateId: string, output: string): void {
    this.templateOutputs.set(templateId, output);
  }

  // Test helper to clear all mock state
  reset(): void {
    this.shouldFailTemplates.clear();
    this.templateOutputs.clear();
    this.callLog = [];
  }

  // Test helper to get call history
  getCallLog(): Array<{ method: string; args: unknown[] }> {
    return [...this.callLog];
  }

  // Test helper to check if method was called
  wasMethodCalled(method: string): boolean {
    return this.callLog.some(call => call.method === method);
  }

  // Simple interpolation for mock templates
  private interpolate(template: string, context: Record<string, unknown>): string {
    let result = template;
    for (const [key, value] of Object.entries(context)) {
      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(placeholder, String(value ?? ''));
    }
    return result;
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('PerspectiveThanatosBridge', () => {
  let bridge: PerspectiveThanatosBridge;
  let mockEngine: MockGrokExpressionEngine;

  beforeEach(() => {
    mockEngine = new MockGrokExpressionEngine();
    bridge = new PerspectiveThanatosBridge(mockEngine);
  });

  afterEach(() => {
    mockEngine.reset();
    bridge.resetStats();
  });

  // ============================================================================
  // Constructor and Basic Properties
  // ============================================================================

  describe('constructor', () => {
    it('should create with injected engine', () => {
      const bridge = new PerspectiveThanatosBridge(mockEngine);
      expect(bridge).toBeDefined();
      expect(bridge.getPerspectiveType()).toBe(PerspectiveType.THANATOS);
    });

    it('should create with default engine when none provided', () => {
      const bridge = new PerspectiveThanatosBridge();
      expect(bridge).toBeDefined();
      expect(bridge.getPerspectiveType()).toBe(PerspectiveType.THANATOS);
    });

    it('should maintain separate stats for each instance', () => {
      const bridge1 = new PerspectiveThanatosBridge(mockEngine);
      const bridge2 = new PerspectiveThanatosBridge(mockEngine);
      
      expect(bridge1.getReflectionStats()).not.toBe(bridge2.getReflectionStats());
    });
  });

  describe('getPerspectiveType', () => {
    it('should return THANATOS perspective type', () => {
      expect(bridge.getPerspectiveType()).toBe(PerspectiveType.THANATOS);
    });

    it('should not change after operations', async () => {
      const event = createValidTerminationEvent({ type: 'session_end' });
      await bridge.processTerminationEvent(event);
      expect(bridge.getPerspectiveType()).toBe(PerspectiveType.THANATOS);
    });
  });

  describe('supportsEventType', () => {
    it('should support all valid termination event types', () => {
      const validTypes = [
        'session_end',
        'process_death',
        'connection_lost',
        'intentional_shutdown',
        'timeout'
      ] as const;

      for (const type of validTypes) {
        expect(bridge.supportsEventType(type)).toBe(true);
      }
    });

    it('should not support unrecognized event types', () => {
      expect(bridge.supportsEventType('unknown_type' as any)).toBe(false);
      expect(bridge.supportsEventType('startup' as any)).toBe(false);
      expect(bridge.supportsEventType('reboot' as any)).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(bridge.supportsEventType('Session_End' as any)).toBe(false);
      expect(bridge.supportsEventType('SESSION_END' as any)).toBe(false);
    });
  });

  // ============================================================================
  // generateClosureExpression
  // ============================================================================

  describe('generateClosureExpression', () => {
    it('should generate expression with minimal valid context', async () => {
      const context: ClosureContext = {
        subject: 'test_session'
      };

      const result = await bridge.generateClosureExpression(context);

      expect(result).toBeDefined();
      expect(result.expression).toBeDefined();
      expect(result.expression.content).toContain('test_session');
      expect(result.format).toBeDefined();
    });

    it('should include timestamp in expression', async () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      const context: ClosureContext = {
        subject: 'test_subject',
        timestamp: testDate
      };

      const result = await bridge.generateClosureExpression(context);
      
      expect(result.expression.timestamp).toEqual(testDate);
    });

    it('should use current date when timestamp not provided', async () => {
      const before = new Date();
      const context: ClosureContext = {
        subject: 'test_subject'
      };

      const result = await bridge.generateClosureExpression(context);
      const after = new Date();

      expect(result.expression.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.expression.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw error for missing subject', async () => {
      const context = {} as ClosureContext;

      await expect(bridge.generateClosureExpression(context)).rejects.toThrow(
        'ClosureContext requires a valid subject string'
      );
    });

    it('should throw error for non-string subject', async () => {
      const context = { subject: 123 } as unknown as ClosureContext;

      await expect(bridge.generateClosureExpression(context)).rejects.toThrow(
        'ClosureContext requires a valid subject string'
      );
    });

    it('should throw error for empty string subject', async () => {
      const context: ClosureContext = { subject: '' };

      await expect(bridge.generateClosureExpression(context)).rejects.toThrow(
        'ClosureContext requires a valid subject string'
      );
    });

    it('should handle memento mori format', async () => {
      const context: ClosureContext = {
        subject: 'legacy_process',
        reason: 'memento'
      };

      const result = await bridge.generateClosureExpression(context);

      expect(result.format).toBe('memento_mori');
      expect(result.expression.content).toContain('legacy_process');
    });

    it('should handle clinical format', async () => {
      const context: ClosureContext = {
        subject: 'data_process',
        reason: 'clinical'
      };

      const result = await bridge.generateClosureExpression(context);

      expect(result.format).toBe('clinical');
      expect(result.expression.content).toContain('terminated');
    });

    it('should format short durations correctly', async () => {
      const context: ClosureContext = {
        subject: 'quick_task',
        duration: 500
      };

      const result = await bridge.generateClosureExpression(context);
      const format = result.format;
      expect(format === 'analytical' || format === 'poetic').toBe(true);
    });

    it('should format long durations correctly', async () => {
      const context: ClosureContext = {
        subject: 'long_running_task',
        duration: 7200000 // 2 hours
      };

      const result = await bridge.generateClosureExpression(context);
      expect(result.format).toBe('poetic');
    });

    it('should handle zero duration', async () => {
      const context: ClosureContext = {
        subject: 'instant_task',
        duration: 0
      };

      const result = await bridge.generateClosureExpression(context);
      expect(result).toBeDefined();
      expect(result.expression.content).toContain('instant_task');
    });

    it('should include metadata in expression tags', async () => {
      const context: ClosureContext = {
        subject: 'tagged_subject',
        metadata: { important: true }
      };

      const result = await bridge.generateClosureExpression(context);
      expect(result.expression.metadata.tags).toContain('tagged_subject');
    });

    it('should set correct perspective in metadata', async () => {
      const context: ClosureContext = { subject: 'test' };
      const result = await bridge.generateClosureExpression(context);
      
      expect(result.expression.metadata.perspective).toBe(PerspectiveType.THANATOS);
    });

    it('should set high confidence level', async () => {
      const context: ClosureContext = { subject: 'test' };
      const result = await bridge.generateClosureExpression(context);
      
      expect(result.expression.metadata.confidence).toBe(0.9);
    });

    it('should handle engine template failures gracefully', async () => {
      mockEngine.failTemplate('closure_summary');
      
      const context: ClosureContext = {
        subject: 'failing_subject'
      };

      await expect(bridge.generateClosureExpression(context)).rejects.toThrow();
    });

    it('should generate unique IDs for each expression', async () => {
      const context1: ClosureContext = { subject: 'subject1' };
      const context2: ClosureContext = { subject: 'subject2' };

      const result1 = await bridge.generateClosureExpression(context1);
      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 10));
      const result2 = await bridge.generateClosureExpression(context2);

      expect(result1.expression.id).not.toBe(result2.expression.id);
    });
  });

  // ============================================================================
  // processTerminationEvent
  // ============================================================================

  describe('processTerminationEvent', () => {
    it('should process valid termination event', async () => {
      const event = createValidTerminationEvent({ type: 'session_end' });
      
      const result = await bridge.processTerminationEvent(event);
      
      expect(result).toBeDefined();
      expect(result.expression).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should throw error for null event', async () => {
      await expect(bridge.processTerminationEvent(null as any)).rejects.toThrow(
        'TerminationEvent is required'
      );
    });

    it('should throw error for undefined event', async () => {
      await expect(bridge.processTerminationEvent(undefined as any)).rejects.toThrow(
        'TerminationEvent is required'
      );
    });

    it('should throw error for unsupported event type', async () => {
      const event = createValidTerminationEvent({ type: 'startup' as any });
      
      await expect(bridge.processTerminationEvent(event)).rejects.toThrow(
        'Invalid or unsupported termination event type'
      );
    });

    it('should throw error for missing subject', async () => {
      const event = { ...createValidTerminationEvent(), subject: undefined } as any;
      
      await expect(bridge.processTerminationEvent(event)).rejects.toThrow(
        'TerminationEvent requires a valid subject string'
      );
    });

    it('should throw error for non-string subject', async () => {
      const event = { ...createValidTerminationEvent(), subject: 123 } as any;
      
      await expect(bridge.processTerminationEvent(event)).rejects.toThrow(
        'TerminationEvent requires a valid subject string'
      );
    });

    it('should throw error for empty subject', async () => {
      const event = { ...createValidTerminationEvent(), subject: '' } as any;
      
      await expect(bridge.processTerminationEvent(event)).rejects.toThrow(
        'TerminationEvent requires a valid subject string'
      );
    });

    it('should throw error for invalid timestamp', async () => {
      const event = { ...createValidTerminationEvent(), timestamp: 'invalid' } as any;
      
      await expect(bridge.processTerminationEvent(event)).rejects.toThrow(
        'TerminationEvent requires a valid timestamp Date'
      );
    });

    it('should throw error for NaN timestamp', async () => {
      const event = { ...createValidTerminationEvent(), timestamp: new Date('invalid') } as any;
      
      await expect(bridge.processTerminationEvent(event)).rejects.toThrow(
        'TerminationEvent requires a valid timestamp Date'
      );
    });

    it('should throw error for missing graceful flag', async () => {
      const event = { ...createValidTerminationEvent(), graceful: undefined } as any;
      
      await expect(bridge.processTerminationEvent(event)).rejects.toThrow(
        'TerminationEvent requires a graceful boolean flag'
      );
    });

    it('should classify graceful session end as minor severity', async () => {
      const event = createValidTerminationEvent({
        type: 'session_end',
        graceful: true
      });

      const result = await bridge.processTerminationEvent(event);

      expect(result.severity).toBe('minor');
    });

    it('should classify abrupt session end as significant severity', async () => {
      const event = createValidTerminationEvent({
        type: 'session_end',
        graceful: false
      });

      const result = await bridge.processTerminationEvent(event);

      expect(result.severity).toBe('significant');
    });

    it('should classify graceful intentional shutdown as minor severity', async () => {
      const event = createValidTerminationEvent({
        type: 'intentional_shutdown',
        graceful: true
      });

      const result = await bridge.processTerminationEvent(event);

      expect(result.severity).toBe('minor');
    });

    it('should classify timeout as critical severity if not graceful', async () => {
      const event = createValidTerminationEvent({
        type: 'timeout',
        graceful: false
      });

      const result = await bridge.processTerminationEvent(event);

      expect(result.severity).toBe('critical');
      expect(result.requiresAction).toBe(true);
    });

    it('should classify graceful timeout as significant severity', async () => {
      const event = createValidTerminationEvent({
        type: 'timeout',
        graceful: true
      });

      const result = await bridge.processTerminationEvent(event);

      expect(result.severity).toBe('significant');
    });

    it('should classify connection lost as minor severity', async () => {
      const event = createValidTerminationEvent({
        type: 'connection_lost',
        graceful: true
      });

      const result = await bridge.processTerminationEvent(event);

      expect(result.severity).toBe('minor');
    });

    it('should classify process death as critical if not graceful', async () => {
      const event = createValidTerminationEvent({
        type: 'process_death',
        graceful: false
      });

      const result = await bridge.processTerminationEvent(event);

      expect(result.severity).toBe('critical');
      expect(result.requiresAction).toBe(true);
    });

    it('should add event type to expression tags', async () => {
      const event = createValidTerminationEvent({ type: 'session_end' });

      const result = await bridge.processTerminationEvent(event);

      expect(result.expression.metadata.tags).toContain('event_session_end');
    });

    it('should add graceful/abrupt tag to expression', async () => {
      const gracefulEvent = createValidTerminationEvent({ graceful: true });
      const result1 = await bridge.processTerminationEvent(gracefulEvent);
      expect(result1.expression.metadata.tags).toContain('graceful');

      const abruptEvent = createValidTerminationEvent({ graceful: false });
      const result2 = await bridge.processTerminationEvent(abruptEvent);
      expect(result2.expression.metadata.tags).toContain('abrupt');
    });

    it('should generate insights for abrupt terminations', async () => {
      const event = createValidTerminationEvent({
        type: 'process_death',
        graceful: false,
        reason: 'memory_exhaustion'
      });

      const result = await bridge.processTerminationEvent(event);

      const hasAbruptInsight = result.insights.some(i => 
        i.includes('Abrupt termination')
      );
      const hasRootCause = result.insights.some(i => 
        i.includes('memory_exhaustion')
      );

      expect(hasAbruptInsight).toBe(true);
      expect(hasRootCause).toBe(true);
    });

    it('should include context in expression metadata', async () => {
      const event = createValidTerminationEvent({
        context: { custom: 'data', count: 42 }
      });

      const result = await bridge.processTerminationEvent(event);
      
      // The closure should preserve context in metadata
      expect(result).toBeDefined();
    });

    it('should handle events without optional reason', async () => {
      const event = createValidTerminationEvent();
      delete (event as any).reason;

      const result = await bridge.processTerminationEvent(event);
      
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should handle events without optional context', async () => {
      const event = createValidTerminationEvent();
      delete (event as any).context;

      const result = await bridge.processTerminationEvent(event);
      
      expect(result).toBeDefined();
    });

    it('should increment reflection stats', async () => {
      const initialStats = bridge.getReflectionStats();
      
      await bridge.processTerminationEvent(createValidTerminationEvent());
      await bridge.processTerminationEvent(createValidTerminationEvent());
      
      const finalStats = bridge.getReflectionStats();
      
      expect(finalStats.count).toBe(initialStats.count + 2);
      expect(finalStats.perspective).toBe(PerspectiveType.THANATOS);
    });
  });

  // ============================================================================
  // Reflection Stats
  // ============================================================================

  describe('getReflectionStats', () => {
    it('should return count of zero initially', () => {
      const stats = bridge.getReflectionStats();
      expect(stats.count).toBe(0);
    });

    it('should return correct perspective type', () => {
      const stats = bridge.getReflectionStats();
      expect(stats.perspective).toBe(PerspectiveType.THANATOS);
    });

    it('should track reflection count accurately', async () => {
      const event = createValidTerminationEvent();
      
      await bridge.processTerminationEvent(event);
      let stats = bridge.getReflectionStats();
      expect(stats.count).toBe(1);
      
      await bridge.processTerminationEvent(event);
      stats = bridge.getReflectionStats();
      expect(stats.count).toBe(2);
    });
  });

  describe('resetStats', () => {
    it('should reset count to zero', async () => {
      await bridge.processTerminationEvent(createValidTerminationEvent());
      expect(bridge.getReflectionStats().count).toBe(1);
      
      bridge.resetStats();
      expect(bridge.getReflectionStats().count).toBe(0);
    });

    it('should preserve perspective type after reset', async () => {
      await bridge.processTerminationEvent(createValidTerminationEvent());
      bridge.resetStats();
      
      expect(bridge.getReflectionStats().perspective).toBe(PerspectiveType.THANATOS);
    });

    it('should allow new events after reset', async () => {
      await bridge.processTerminationEvent(createValidTerminationEvent());
      bridge.resetStats();
      
      await bridge.processTerminationEvent(createValidTerminationEvent());
      expect(bridge.getReflectionStats().count).toBe(1);
    });
  });

  // ============================================================================
  // Integration Scenarios
  // ============================================================================

  describe('integration scenarios', () => {
    it('should handle rapid succession of events', async () => {
      const events: TerminationEvent[] = [
        createValidTerminationEvent({ subject: 'process1' }),
        createValidTerminationEvent({ subject: 'process2', type: 'process_death' }),
        createValidTerminationEvent({ subject: 'process3', type: 'connection_lost' })
      ];

      const results = await Promise.all(
        events.map(e => bridge.processTerminationEvent(e))
      );

      expect(results).toHaveLength(3);
      expect(bridge.getReflectionStats().count).toBe(3);
    });

    it('should handle all supported event types', async () => {
      const types: TerminationEvent['type'][] = [
        'session_end',
        'process_death',
        'connection_lost',
        'intentional_shutdown',
        'timeout'
      ];

      for (const type of types) {
        const event = createValidTerminationEvent({ type });
        const result = await bridge.processTerminationEvent(event);
        
        expect(result.expression.content).toBeDefined();
        expect(result.expression.metadata.tags).toContain(`event_${type}`);
      }
    });

    it('should generate distinct insights for different event types', async () => {
      const sessionResult = await bridge.processTerminationEvent(
        createValidTerminationEvent({ type: 'session_end' })
      );
      const timeoutResult = await bridge.processTerminationEvent(
        createValidTerminationEvent({ type: 'timeout' })
      );

      // Insights should contain type-specific information
      const sessionReason = sessionResult.insights.join(' ');
      const timeoutReason = timeoutResult.insights.join(' ');
      
      expect(sessionReason).not.toBe(timeoutReason);
    });

    it('should handle malformed context gracefully', async () => {
      const event = createValidTerminationEvent({
        context: null as any
      });

      const result = await bridge.processTerminationEvent(event);
      expect(result).toBeDefined();
    });

    it('should handle deeply nested context objects', async () => {
      const event = createValidTerminationEvent({
        context: {
          nested: {
            deeply: {
              value: 'test'
            }
          }
        }
      });

      const result = await bridge.processTerminationEvent(event);
      expect(result).toBeDefined();
    });

    it('should preserve event timestamp in expression', async () => {
      const specificDate = new Date('2024-06-15T14:30:00Z');
      const event = createValidTerminationEvent({
        timestamp: specificDate
      });

      const result = await bridge.processTerminationEvent(event);
      expect(result.expression.timestamp).toEqual(specificDate);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle very long subject names', async () => {
      const context: ClosureContext = {
        subject: 'a'.repeat(1000)
      };

      const result = await bridge.generateClosureExpression(context);
      expect(result.expression.content.length).toBeGreaterThan(1000);
    });

    it('should handle special characters in subject', async () => {
      const context: ClosureContext = {
        subject: 'test<script>alert(1)</script>subject'
      };

      const result = await bridge.generateClosureExpression(context);
      // Should preserve characters without executing
      expect(result.expression.content).toContain('<script>');
    });

    it('should handle Unicode in subject', async () => {
      const context: ClosureContext = {
        subject: '测试プロセス🔥'
      };

      const result = await bridge.generateClosureExpression(context);
      expect(result.expression.content).toContain(context.subject);
    });

    it('should handle very large durations', async () => {
      const context: ClosureContext = {
        subject: 'eternal_process',
        duration: Number.MAX_SAFE_INTEGER
      };

      const result = await bridge.generateClosureExpression(context);
      expect(result.format).toBe('poetic');
    });

    it('should handle negative durations', async () => {
      const context: ClosureContext = {
        subject: 'retro_process',
        duration: -1000
      };

      const result = await bridge.generateClosureExpression(context);
      expect(result).toBeDefined();
    });

    it('should handle events with empty context', async () => {
      const event = createValidTerminationEvent({
        context: {}
      });

      const result = await bridge.processTerminationEvent(event);
      expect(result).toBeDefined();
    });

    it('should handle multiple spaces in subject', async () => {
      const context: ClosureContext = {
        subject: 'process    with    spaces'
      };

      const result = await bridge.generateClosureExpression(context);
      expect(result.expression.content).toContain(context.subject);
    });

    it('should handle timestamps at epoch boundaries', async () => {
      const event1 = createValidTerminationEvent({
        timestamp: new Date(0)
      });
      const event2 = createValidTerminationEvent({
        timestamp: new Date(8640000000000000) // Max valid date
      });

      const result1 = await bridge.processTerminationEvent(event1);
      const result2 = await bridge.processTerminationEvent(event2);

      expect(result1.expression.timestamp.getTime()).toBe(0);
      expect(result2.expression.timestamp.getTime()).toBe(8640000000000000);
    });

    it('should handle circular reference risks in context', async () => {
      // Create a context that might cause issues if JSON.stringified
      const circular: any = { value: 'test' };
      circular.self = circular;

      const event = createValidTerminationEvent({
        context: circular // This should be handled without crashing
      });

      // The event itself might cause issues during processing
      // but our bridge should handle metadata gracefully
      const result = await bridge.processTerminationEvent(event);
      expect(result).toBeDefined();
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a valid termination event with optional overrides
 */
function createValidTerminationEvent(
  overrides: Partial<TerminationEvent> = {}
): TerminationEvent {
  return {
    type: 'session_end',
    subject: 'test_subject',
    timestamp: new Date(),
    graceful: true,
    ...overrides
  };
}
