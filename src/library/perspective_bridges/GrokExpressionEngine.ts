/**
 * Grok Expression Engine
 * 
 * A core engine for synthesizing and expressing understanding across
 * multiple perspectives. Handles template generation, contextual
 * formatting, and introspection capabilities.
 */

export interface Expression {
  id: string;
  content: string;
  metadata: ExpressionMetadata;
  timestamp: Date;
}

export interface ExpressionMetadata {
  source: string;
  perspective: string;
  confidence: number;
  tags: string[];
}

export interface SynthesisOptions {
  format?: 'compact' | 'verbose' | 'poetic' | 'analytical';
  maxLength?: number;
  includeMetadata?: boolean;
  prioritySource?: string;
}

export interface EngineMetadata {
  version: string;
  capabilities: string[];
  loadedTemplates: number;
  synthesisCount: number;
}

export interface TemplateDefinition {
  id: string;
  template: string;
  requiredVariables: string[];
  description?: string;
}

export class GrokExpressionEngine {
  private templates: Map<string, TemplateDefinition> = new Map();
  private synthesisCount = 0;
  private readonly version = '1.0.0';
  private capabilities: string[] = ['synthesis', 'templating', 'introspection'];

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Synthesize multiple expressions into a unified output
   */
  synthesize(expressions: Expression[], options: SynthesisOptions = {}): Expression {
    this.synthesisCount++;
    
    if (!expressions || expressions.length === 0) {
      return this.createEmptyExpression();
    }

    const validExpressions = expressions.filter(e => this.isValidExpression(e));
    
    if (validExpressions.length === 0) {
      return this.createEmptyExpression();
    }

    const format = options.format || 'analytical';
    const content = this.generateFormattedContent(validExpressions, format);
    
    // Aggregate metadata
    const sources = [...new Set(validExpressions.map(e => e.metadata.source))];
    const perspectives = [...new Set(validExpressions.map(e => e.metadata.perspective))];
    const avgConfidence = validExpressions.reduce((sum, e) => sum + e.metadata.confidence, 0) / validExpressions.length;

    return {
      id: `synth_${this.synthesisCount}_${Date.now()}`,
      content,
      metadata: {
        source: sources.join(', '),
        perspective: perspectives.join('+'),
        confidence: avgConfidence,
        tags: ['synthesized', format, ...this.aggregateTags(validExpressions)]
      },
      timestamp: new Date()
    };
  }

  /**
   * Generate content from a template with context variables
   */
  generateTemplate(templateId: string, context: Record<string, unknown>): string {
    const template = this.templates.get(templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate required variables
    const missingVariables = template.requiredVariables.filter(
      v => !(v in context)
    );
    
    if (missingVariables.length > 0) {
      throw new Error(
        `Missing required variables for template '${templateId}': ${missingVariables.join(', ')}`
      );
    }

    // Simple template interpolation
    let result = template.template;
    for (const [key, value] of Object.entries(context)) {
      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(placeholder, String(value ?? ''));
    }

    return result;
  }

  /**
   * Get engine metadata for introspection
   */
  introspect(): EngineMetadata {
    return {
      version: this.version,
      capabilities: [...this.capabilities],
      loadedTemplates: this.templates.size,
      synthesisCount: this.synthesisCount
    };
  }

  /**
   * Register a new template
   */
  registerTemplate(definition: TemplateDefinition): void {
    this.templates.set(definition.id, definition);
  }

  /**
   * Check if a template exists
   */
  hasTemplate(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  /**
   * Get a template definition
   */
  getTemplate(templateId: string): TemplateDefinition | undefined {
    return this.templates.get(templateId);
  }

  /**
   * List all registered template IDs
   */
  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  // Private methods

  private registerDefaultTemplates(): void {
    this.registerTemplate({
      id: 'closure_summary',
      template: 'Process {{name}} has reached its conclusion after {{duration}}. {{reflection}}',
      requiredVariables: ['name', 'duration', 'reflection'],
      description: 'Template for summarizing process closures'
    });

    this.registerTemplate({
      id: 'memento_mori',
      template: 'In the ledger of finite things, {{subject}} yields to transition at {{timestamp}}.',
      requiredVariables: ['subject', 'timestamp'],
      description: 'Memento mori style termination reflection'
    });

    this.registerTemplate({
      id: 'synthesis_report',
      template: 'Synthesized {{count}} perspectives: {{summary}}',
      requiredVariables: ['count', 'summary'],
      description: 'Report template for synthesis operations'
    });
  }

  private isValidExpression(expression: Expression): boolean {
    return !!(
      expression &&
      typeof expression.content === 'string' &&
      expression.metadata &&
      typeof expression.metadata.confidence === 'number'
    );
  }

  private createEmptyExpression(): Expression {
    return {
      id: `empty_${Date.now()}`,
      content: '',
      metadata: {
        source: 'none',
        perspective: 'void',
        confidence: 0,
        tags: ['empty']
      },
      timestamp: new Date()
    };
  }

  private generateFormattedContent(expressions: Expression[], format: string): string {
    const contents = expressions.map(e => e.content);
    
    switch (format) {
      case 'compact':
        return contents.join(' | ');
      case 'poetic':
        return contents.map(c => `~ ${c} ~`).join('\n');
      case 'verbose':
        return contents.map((c, i) => `[${i + 1}] ${c}`).join('\n---\n');
      case 'analytical':
      default:
        return contents.join(' ');
    }
  }

  private aggregateTags(expressions: Expression[]): string[] {
    const allTags = expressions.flatMap(e => e.metadata.tags || []);
    return [...new Set(allTags)];
  }
}
