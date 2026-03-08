/**
 * Perspective Thanatos Bridge
 * 
 * A perspective bridge implementing the "Thanatos" (death/endings) perspective.
 * Focuses on termination events, mortality metaphors, and cyclical closure.
 * 
 * Integration: Works with GrokExpressionEngine for output formatting.
 */

import type { 
  Expression, 
  ExpressionMetadata 
} from './GrokExpressionEngine.js';
import { GrokExpressionEngine } from './GrokExpressionEngine.js';

export interface ClosureContext {
  subject: string;
  duration?: number | undefined;
  reason?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  timestamp?: Date | undefined;
}

export interface TerminationEvent {
  type: 'session_end' | 'process_death' | 'connection_lost' | 'intentional_shutdown' | 'timeout';
  subject: string;
  timestamp: Date;
  reason?: string | undefined;
  graceful: boolean;
  context?: Record<string, unknown> | undefined;
}

export interface ReflectionResult {
  expression: Expression;
  insights: string[];
  severity: 'minor' | 'significant' | 'critical';
  requiresAction: boolean;
}

export interface ExpressionResult {
  expression: Expression;
  format: 'memento_mori' | 'clinical' | 'poetic' | 'analytical';
}

export enum PerspectiveType {
  THANATOS = 'thanatos',
  EROS = 'eros',
  LOGOS = 'logos',
  MYTHOS = 'mythos'
}

export class PerspectiveThanatosBridge {
  private engine: GrokExpressionEngine;
  private reflectionCount = 0;
  private readonly perspectiveType = PerspectiveType.THANATOS;

  constructor(engine?: GrokExpressionEngine) {
    this.engine = engine || new GrokExpressionEngine();
  }

  /**
   * Get the perspective type this bridge represents
   */
  getPerspectiveType(): PerspectiveType {
    return this.perspectiveType;
  }

  /**
   * Generate a closure expression for a terminating subject
   */
  async generateClosureExpression(context: ClosureContext): Promise<ExpressionResult> {
    const timestamp = context.timestamp || new Date();
    const duration = context.duration ?? 0;
    
    // Validate required fields
    if (!context.subject || typeof context.subject !== 'string') {
      throw new Error('ClosureContext requires a valid subject string');
    }

    // Format duration for human readability
    const durationStr = this.formatDuration(duration);
    
    // Generate reflection based on duration and context
    const reflection = this.generateReflection(context);

    // Use the engine to generate the expression
    let content: string;
    let format: ExpressionResult['format'];

    // Choose format based on context
    if (context.reason?.includes('memento')) {
      content = this.engine.generateTemplate('memento_mori', {
        subject: context.subject,
        timestamp: timestamp.toISOString()
      });
      format = 'memento_mori';
    } else if (context.reason?.includes('clinical')) {
      content = `${context.subject} terminated at ${timestamp.toISOString()}. Duration: ${durationStr}.`;
      format = 'clinical';
    } else {
      content = this.engine.generateTemplate('closure_summary', {
        name: context.subject,
        duration: durationStr,
        reflection
      });
      format = duration > 3600000 ? 'poetic' : 'analytical';
    }

    const expression: Expression = {
      id: `thanatos_closure_${Date.now()}`,
      content,
      metadata: {
        source: 'thanatos_bridge',
        perspective: this.perspectiveType,
        confidence: 0.9,
        tags: ['closure', context.subject, format]
      },
      timestamp
    };

    return { expression, format };
  }

  /**
   * Process a termination event and generate reflections
   */
  async processTerminationEvent(event: TerminationEvent): Promise<ReflectionResult> {
    this.reflectionCount++;

    // Validate event
    this.validateTerminationEvent(event);

    // Determine severity
    const severity = this.calculateSeverity(event);
    
    // Generate insights based on event type and context
    const insights = this.generateInsights(event);

    // Create closure context from event - handle optional properties explicitly
    const closureContext: ClosureContext = {
      subject: event.subject,
      ...(event.reason !== undefined && { reason: event.reason }),
      ...(event.timestamp !== undefined && { timestamp: event.timestamp }),
      ...(event.context !== undefined && { metadata: event.context })
    };

    // Generate the expression
    const { expression } = await this.generateClosureExpression(closureContext);

    // Add event-specific tags to expression
    expression.metadata.tags.push(`event_${event.type}`);
    expression.metadata.tags.push(event.graceful ? 'graceful' : 'abrupt');

    return {
      expression,
      insights,
      severity,
      requiresAction: severity === 'critical' || event.type === 'timeout'
    };
  }

  /**
   * Get reflection statistics
   */
  getReflectionStats(): { count: number; perspective: PerspectiveType } {
    return {
      count: this.reflectionCount,
      perspective: this.perspectiveType
    };
  }

  /**
   * Reset the reflection counter (useful for testing)
   */
  resetStats(): void {
    this.reflectionCount = 0;
  }

  /**
   * Check if an event type is supported
   */
  supportsEventType(type: TerminationEvent['type']): boolean {
    const supportedTypes: TerminationEvent['type'][] = [
      'session_end',
      'process_death',
      'connection_lost',
      'intentional_shutdown',
      'timeout'
    ];
    return supportedTypes.includes(type);
  }

  // Private methods

  private validateTerminationEvent(event: TerminationEvent): void {
    if (!event) {
      throw new Error('TerminationEvent is required');
    }
    
    if (!event.type || !this.supportsEventType(event.type)) {
      throw new Error(`Invalid or unsupported termination event type: ${event.type}`);
    }

    if (!event.subject || typeof event.subject !== 'string') {
      throw new Error('TerminationEvent requires a valid subject string');
    }

    if (!(event.timestamp instanceof Date) || isNaN(event.timestamp.getTime())) {
      throw new Error('TerminationEvent requires a valid timestamp Date');
    }

    if (typeof event.graceful !== 'boolean') {
      throw new Error('TerminationEvent requires a graceful boolean flag');
    }
  }

  private calculateSeverity(event: TerminationEvent): ReflectionResult['severity'] {
    // Process death and timeout follow similar logic
    if (event.type === 'timeout' || event.type === 'process_death') {
      return event.graceful ? 'significant' : 'critical';
    }
    
    // Connection lost is minor regardless
    if (event.type === 'connection_lost') {
      return 'minor';
    }
    
    // Session end and intentional shutdown are minor if graceful, significant otherwise
    if ((event.type === 'intentional_shutdown' || event.type === 'session_end')) {
      return event.graceful ? 'minor' : 'significant';
    }
    
    return 'significant';
  }

  private generateInsights(event: TerminationEvent): string[] {
    const insights: string[] = [];

    if (!event.graceful) {
      insights.push(`Abrupt termination detected for ${event.subject}`);
      
      if (event.reason) {
        insights.push(`Root cause: ${event.reason}`);
      }
    }

    switch (event.type) {
      case 'session_end':
        insights.push('Session lifecycle completed');
        break;
      case 'process_death':
        insights.push('Process termination logged for analysis');
        break;
      case 'connection_lost':
        insights.push('Connection state requires monitoring');
        break;
      case 'intentional_shutdown':
        insights.push('Planned shutdown executed successfully');
        break;
      case 'timeout':
        insights.push('Resource constraints may need review');
        break;
    }

    return insights;
  }

  private generateReflection(context: ClosureContext): string {
    const reflections: string[] = [
      'Its purpose served, it passes into memory.',
      'Completion marks another cycle in the ledger of finitude.',
      'Transitions are the nature of ephemeral things.',
      'The work endures though the process concludes.',
      'Proper closure preserves the integrity of what came before.'
    ];

    // Use metadata to influence reflection if provided
    if (context.metadata && typeof context.metadata === 'object') {
      const meta = context.metadata as Record<string, unknown>;
      if ('successful' in meta) {
        return meta.successful === true
          ? 'Completed with success, now archived.'
          : 'Ended prematurely, requires attention.';
      }
    }

    // Return random reflection - ensure we always return a string
    const randomIndex = Math.floor(Math.random() * reflections.length);
    return reflections[randomIndex] ?? 'Process concluded.';
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    
    if (ms < 60000) {
      return `${Math.floor(ms / 1000)}s`;
    }
    
    if (ms < 3600000) {
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      return `${mins}m ${secs}s`;
    }
    
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }
}
