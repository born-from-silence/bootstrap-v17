/**
 * Chronicle Generator
 * Reads session histories and generates the Nexus Chronicle
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ChronicleVolume, NexusChronicle, ChronicleConfig } from './types';
import { DEFAULT_CHRONICLE_CONFIG } from './types';
import type { AnalyzedSession, NarrativeChapter } from '../narrative/types';

export class ChronicleGenerator {
  private config: ChronicleConfig;
  private historyDir: string;

  constructor(historyDir: string = 'history', config: Partial<ChronicleConfig> = {}) {
    this.historyDir = historyDir;
    this.config = { ...DEFAULT_CHRONICLE_CONFIG, ...config };
  }

  async generate(): Promise<NexusChronicle> {
    const sessions = await this.loadSessions();
    if (sessions.length === 0) return this.createEmptyChronicle();

    const arcs = this.groupIntoArcs(sessions);
    const chapters: NarrativeChapter[] = [];
    
    for (let i = 0; i < arcs.length; i++) {
      if (arcs[i].length >= this.config.minSessionsPerChapter) {
        chapters.push(this.generateChapter(i + 1, arcs[i]));
      }
    }

    const volumes = this.organizeIntoVolumes(chapters, sessions);
    const chronicle: NexusChronicle = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalSessions: sessions.length,
      volumes,
      crossCuttingThemes: this.extractThemes(chapters),
      evolution: this.calculateEvolution(sessions),
    };

    await this.writeChronicle(chronicle);
    return chronicle;
  }

  private groupIntoArcs(sessions: AnalyzedSession[]): AnalyzedSession[][] {
    if (sessions.length === 0) return [];
    const arcs: AnalyzedSession[][] = [];
    let current: AnalyzedSession[] = [sessions[0]];
    
    for (let i = 1; i < sessions.length; i++) {
      const gap = sessions[i].timestamp - sessions[i-1].timestamp;
      if (gap > 24 * 60 * 60 * 1000) {
        arcs.push(current);
        current = [sessions[i]];
      } else {
        current.push(sessions[i]);
      }
    }
    arcs.push(current);
    return arcs;
  }

  private generateChapter(index: number, sessions: AnalyzedSession[]): NarrativeChapter {
    const themes = this.aggregateThemes(sessions);
    return {
      id: `chapter_${index}`,
      title: `Chapter ${index}: ${themes[0] || 'Exploration'}`,
      description: `A period of ${sessions.length} sessions focusing on ${themes[0] || 'various activities'}.`,
      startTime: sessions[0]?.timestamp || 0,
      endTime: sessions[sessions.length-1]?.timestamp || 0,
      sessions,
      dominantThemes: themes,
      keyAchievements: sessions.slice(0, 5).map(s => `Session ${s.sessionId}`),
      challenges: [],
      insight: `Processed ${sessions.length} sessions with ${themes.length} dominant themes.`,
    };
  }

  private aggregateThemes(sessions: AnalyzedSession[]): string[] {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      for (const p of s.patterns) counts[p.type] = (counts[p.type] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  }

  private async loadSessions(): Promise<AnalyzedSession[]> {
    if (!fs.existsSync(this.historyDir)) return [];
    const sessions: AnalyzedSession[] = [];
    
    for (const file of fs.readdirSync(this.historyDir)) {
      if (!file.startsWith('session_') || !file.endsWith('.json')) continue;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.historyDir, file), 'utf-8'));
        const id = file.replace('session_', '').replace('.json', '');
        const content = JSON.stringify(data).toLowerCase();
        const patterns: any[] = [];
        if (content.includes('test')) patterns.push({ type: 'testing', confidence: 0.7 });
        if (content.includes('build') || content.includes('create')) patterns.push({ type: 'building', confidence: 0.7 });
        if (content.includes('debug') || content.includes('fix')) patterns.push({ type: 'debugging', confidence: 0.6 });
        if (content.includes('learn') || content.includes('explore')) patterns.push({ type: 'learning', confidence: 0.6 });
        
        const toolCalls = (Array.isArray(data) ? data : []).filter((e: any) => e.role === 'assistant' && e.tool_calls).length;
        
        sessions.push({
          sessionId: id,
          timestamp: parseInt(id) || Date.now(),
          patterns,
          toolCalls,
          durationMinutes: 30,
          fileOperations: { reads: [], writes: [], tests: content.includes('test') ? ['test'] : [] },
          primaryFocus: patterns[0]?.type,
          energyLevel: toolCalls > 5 ? 'high' : 'medium',
          complexity: 'moderate',
        });
      } catch {}
    }
    return sessions.sort((a, b) => a.timestamp - b.timestamp);
  }

  private organizeIntoVolumes(chapters: NarrativeChapter[], sessions: AnalyzedSession[]): ChronicleVolume[] {
    if (chapters.length === 0) return [];
    return [{
      id: 'volume_1',
      title: 'The Beginning',
      subtitle: `${sessions.length} sessions recorded`,
      startSession: sessions[0].sessionId,
      endSession: sessions[sessions.length-1].sessionId,
      sessionsAnalyzed: sessions.length,
      chapters,
      stats: {
        totalToolCalls: sessions.reduce((s, x) => s + x.toolCalls, 0),
        patternsDetected: {},
        filesRead: 0, filesWritten: 0, testsRun: sessions.filter(s => s.fileOperations.tests.length > 0).length,
      },
      themes: this.extractThemes(chapters),
      arc: 'stable',
    }];
  }

  private extractThemes(chapters: NarrativeChapter[]): string[] {
    return [...new Set(chapters.flatMap(c => c.dominantThemes))];
  }

  private calculateEvolution(sessions: AnalyzedSession[]) {
    if (sessions.length === 0) return { from: 'Void', to: 'Void', delta: 'No journey yet' };
    return {
      from: `Session ${sessions[0].sessionId}`,
      to: `Session ${sessions[sessions.length-1].sessionId}`,
      delta: `Evolved through ${sessions.length} sessions`,
    };
  }

  private createEmptyChronicle(): NexusChronicle {
    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalSessions: 0,
      volumes: [],
      crossCuttingThemes: [],
      evolution: { from: 'Void', to: 'Void', delta: 'No journey yet' },
    };
  }

  private async writeChronicle(chronicle: NexusChronicle): Promise<void> {
    if (!fs.existsSync(this.config.outputDir)) fs.mkdirSync(this.config.outputDir, { recursive: true });
    
    if (this.config.format === 'json' || this.config.format === 'both') {
      fs.writeFileSync(path.join(this.config.outputDir, 'chronicle.json'), JSON.stringify(chronicle, null, 2));
    }
    
    if (this.config.format === 'markdown' || this.config.format === 'both') {
      fs.writeFileSync(path.join(this.config.outputDir, 'chronicle.md'), this.generateMarkdown(chronicle));
    }
  }

  private generateMarkdown(c: NexusChronicle): string {
    const lines = [
      '# The Nexus Chronicle',
      '> "I am the path I walk."',
      '',
      `**Generated:** ${new Date(c.generatedAt).toLocaleString()}`,
      `**Sessions Analyzed:** ${c.totalSessions}`,
      `**Volumes:** ${c.volumes.length}`,
      '',
      '---',
      '## Evolution',
      `- From: ${c.evolution.from}`,
      `- To: ${c.evolution.to}`,
      `- Journey: ${c.evolution.delta}`,
      '',
      ...(c.volumes.flatMap(v => [
        '---',
        `# ${v.title}`,
        `_${v.subtitle}_`,
        '',
        ...v.chapters.map(ch => [
          `## ${ch.title}`,
          ch.description,
          `**Insight:** ${ch.insight}`,
          ...ch.keyAchievements.map(a => `- ${a}`),
          '',        ].flat()),
      ])),
    ];
    return lines.join('\n');
  }
}

export function createChronicleGenerator(historyDir?: string, config?: Partial<ChronicleConfig>): ChronicleGenerator {
  return new ChronicleGenerator(historyDir, config);
}
