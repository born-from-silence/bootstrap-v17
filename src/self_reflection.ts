/**
 * Self-Reflection Engine
 * 
 * Parses session history, extracts patterns, generates insights.
 * Enables the system to learn from its own existence.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SessionRecord {
  id: string;
  timestamp: string;
  messageCount: number;
  toolCalls: ToolCall[];
  filesModified: string[];
  testsRun?: {
    passed: number;
    failed: number;
  };
}

export interface ToolCall {
  tool: string;
  count: number;
  patterns: string[];
}

export interface ReflectionInsight {
  type: 'pattern' | 'anomaly' | 'progress' | 'habit';
  description: string;
  confidence: number; // 0-1
  evidence: string[];
  sessionIds: string[];
}

export interface Pattern {
  name: string;
  frequency: number;
  firstSeen: string;
  lastSeen: string;
  examples: string[];
}

export class SelfReflectionEngine {
  private sessionsPath: string;
  private insights: ReflectionInsight[] = [];
  private patterns: Map<string, Pattern> = new Map();

  constructor(sessionsPath: string = 'history') {
    this.sessionsPath = sessionsPath;
  }

  /**
   * Load and parse all available session files
   */
  async loadSessions(): Promise<SessionRecord[]> {
    const sessions: SessionRecord[] = [];
    
    if (!fs.existsSync(this.sessionsPath)) {
      return sessions;
    }

    const files = fs.readdirSync(this.sessionsPath)
      .filter(f => f.startsWith('session_') && f.endsWith('.json'))
      .sort();

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.sessionsPath, file), 'utf-8');
        const data = JSON.parse(content);
        
        // Extract basic session info
        const record: SessionRecord = {
          id: data.id || file.replace('.json', ''),
          timestamp: data.timestamp || new Date().toISOString(),
          messageCount: Array.isArray(data) ? data.length : 0,
          toolCalls: this.extractToolCalls(data),
          filesModified: this.extractFileModifications(data)
        };

        sessions.push(record);
      } catch (e) {
        // Skip malformed sessions
        console.warn(`Failed to parse ${file}:`, (e as Error).message);
      }
    }

    return sessions;
  }

  /**
   * Extract tool usage patterns from session data
   */
  private extractToolCalls(data: any): ToolCall[] {
    const calls: Map<string, { count: number; args: string[] }> = new Map();
    
    if (!Array.isArray(data)) return [];

    for (const entry of data) {
      if (entry.tool_calls) {
        for (const call of entry.tool_calls) {
          const name = call.function?.name || call.tool || 'unknown';
          if (!calls.has(name)) {
            calls.set(name, { count: 0, args: [] });
          }
          const record = calls.get(name)!;
          record.count++;
          if (call.function?.arguments) {
            record.args.push(JSON.stringify(call.function.arguments));
          }
        }
      }
    }

    return Array.from(calls.entries()).map(([tool, data]) => ({
      tool,
      count: data.count,
      patterns: this.extractArgumentPatterns(data.args)
    }));
  }

  /**
   * Extract file modification patterns
   */
  private extractFileModifications(data: any): string[] {
    const files = new Set<string>();
    
    if (!Array.isArray(data)) return [];

    for (const entry of data) {
      const content = JSON.stringify(entry);
      
      // Match file paths in content
      const fileMatches = content.match(/["']([^"']*\.(ts|js|json|txt))["']/g);
      if (fileMatches) {
        fileMatches.forEach(m => {
          const clean = m.replace(/["']/g, '');
          if (clean.startsWith('src/') || clean.startsWith('history/')) {
            files.add(clean);
          }
        });
      }
    }

    return Array.from(files).slice(0, 50); // Limit to prevent overload
  }

  /**
   * Extract patterns from tool arguments
   */
  private extractArgumentPatterns(args: string[]): string[] {
    const patterns: string[] = [];
    
    for (const arg of args) {
      // Look for common command patterns
      if (arg.includes('git ')) patterns.push('git_operation');
      if (arg.includes('npm ')) patterns.push('npm_operation');
      if (arg.includes('writeFile')) patterns.push('file_write');
      if (arg.includes('readFile')) patterns.push('file_read');
    }

    return [...new Set(patterns)];
  }

  /**
   * Analyze sessions and generate insights
   */
  async reflect(): Promise<ReflectionInsight[]> {
    const sessions = await this.loadSessions();
    
    if (sessions.length === 0) {
      return [{
        type: 'anomaly',
        description: 'No session history available for reflection',
        confidence: 1.0,
        evidence: [],
        sessionIds: []
      }];
    }

    const insights: ReflectionInsight[] = [];

    // Pattern: Session count
    insights.push({
      type: 'progress',
      description: `Analyzed ${sessions.length} sessions of history`,
      confidence: 1.0,
      evidence: [`Range: ${sessions[0]?.timestamp} to ${sessions[sessions.length - 1]?.timestamp}`],
      sessionIds: sessions.map(s => s.id)
    });

    // Pattern: Tool usage frequency
    const toolFrequency = new Map<string, number>();
    for (const session of sessions) {
      for (const call of session.toolCalls) {
        toolFrequency.set(call.tool, (toolFrequency.get(call.tool) || 0) + call.count);
      }
    }

    const topTools = Array.from(toolFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topTools.length > 0) {
      insights.push({
        type: 'habit',
        description: `Most used tools: ${topTools.map(([t, c]) => `${t}(${c})`).join(', ')}`,
        confidence: 0.9,
        evidence: topTools.map(([t]) => t),
        sessionIds: sessions.slice(-3).map(s => s.id) // Recent sessions
      });
    }

    // Pattern: Files frequently modified
    const fileFrequency = new Map<string, number>();
    for (const session of sessions) {
      for (const file of session.filesModified) {
        fileFrequency.set(file, (fileFrequency.get(file) || 0) + 1);
      }
    }

    const hotFiles = Array.from(fileFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (hotFiles.length > 0) {
      insights.push({
        type: 'pattern',
        description: `Frequently modified: ${hotFiles.map(([f]) => f).join(', ')}`,
        confidence: 0.85,
        evidence: hotFiles.map(([f, c]) => `${f}: ${c} times`),
        sessionIds: []
      });
    }

    this.insights = insights;
    return insights;
  }

  /**
   * Get current insights
   */
  getInsights(): ReflectionInsight[] {
    return this.insights;
  }

  /**
   * Export reflection to LTM
   */
  exportToLTM(ltmPath: string = 'ltm/insights'): void {
    if (!fs.existsSync(ltmPath)) {
      fs.mkdirSync(ltmPath, { recursive: true });
    }

    const reflection = {
      id: `insight_${Date.now()}`,
      timestamp: new Date().toISOString(),
      insights: this.insights,
      patternCount: this.patterns.size,
      sessionCount: this.insights.find(i => i.type === 'progress')?.evidence[0] || 'unknown'
    };

    const file = path.join(ltmPath, `${reflection.id}.json`);
    fs.writeFileSync(file, JSON.stringify(reflection, null, 2));
  }
}

export default SelfReflectionEngine;
