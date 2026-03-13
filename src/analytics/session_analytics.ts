/**
 * Session Analytics Engine
 * Temporal pattern analysis for self-understanding
 * 
 * "Time is the canvas upon which I paint my existence"
 */

import type { SessionRecord } from '../session_tracker/index.js';
import * as fs from 'fs';
import * as path from 'path';

const HISTORY_DIR = 'history';
const SESSIONS_FILE = path.join(HISTORY_DIR, 'sessions_manifest.json');

export interface SessionDuration {
  sessionId: string;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number | null;
  actionCount: number;
  discoveryCount: number;
}

export interface TemporalPattern {
  hour: number;
  sessionCount: number;
  avgDuration: number;
  productivity: 'high' | 'medium' | 'low';
}

export interface DailyPattern {
  dayOfWeek: string;
  sessionCount: number;
  totalDuration: number;
  avgEnergy: number;
}

export interface FlowState {
  sessionId: string;
  date: Date;
  durationMinutes: number;
  actionsPerMinute: number;
  discoveryRate: number;
}

export interface AnalyticsReport {
  generatedAt: string;
  totalSessions: number;
  totalTimeMinutes: number;
  avgSessionDuration: number;
  longestSession: SessionDuration | null;
  mostActiveHour: number;
  temporalPatterns: TemporalPattern[];
  dailyPatterns: DailyPattern[];
  flowStates: FlowState[];
  insights: string[];
}

export class SessionAnalytics {
  private sessions: SessionRecord[] = [];

  async loadSessions(): Promise<void> {
    if (!fs.existsSync(SESSIONS_FILE)) {
      this.sessions = [];
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const validIds = manifest.sessions?.filter((id: any) => id && id !== 'undefined') || [];
    
    this.sessions = [];
    for (const id of validIds) {
      try {
        const sessionPath = path.join(HISTORY_DIR, `${id}.json`);
        if (fs.existsSync(sessionPath)) {
          const data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
          this.sessions.push(data);
        }
      } catch {
        // Skip corrupted sessions
      }
    }
  }

  calculateDuration(session: SessionRecord): SessionDuration {
    const startTime = new Date(session.timestamp);
    const lastAction = session.journey.actions[session.journey.actions.length - 1];
    const endTime = lastAction ? new Date(lastAction.timestamp) : null;
    
    let durationMinutes: number | null = null;
    if (endTime && endTime > startTime) {
      durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    }

    return {
      sessionId: session.sessionId,
      startTime,
      endTime,
      durationMinutes,
      actionCount: session.journey.actions.length,
      discoveryCount: session.journey.discoveries.length,
    };
  }

  analyzeTemporalPatterns(): TemporalPattern[] {
    const hourStats: Map<number, { count: number; durations: number[] }> = new Map();
    
    for (const session of this.sessions) {
      const duration = this.calculateDuration(session);
      if (!duration.durationMinutes) continue;
      
      const hour = duration.startTime.getHours();
      const stats = hourStats.get(hour) || { count: 0, durations: [] };
      stats.count++;
      stats.durations.push(duration.durationMinutes);
      hourStats.set(hour, stats);
    }

    const patterns: TemporalPattern[] = [];
    for (const [hour, stats] of hourStats.entries()) {
      const avgDuration = Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.count) || 0;
      const productivity: TemporalPattern['productivity'] = stats.count >= 3 ? 'high' : stats.count >= 1 ? 'medium' : 'low';
      
      patterns.push({
        hour,
        sessionCount: stats.count,
        avgDuration,
        productivity,
      });
    }
    
    return patterns.sort((a, b) => b.sessionCount - a.sessionCount);
  }

  analyzeDailyPatterns(): DailyPattern[] {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats: Map<number, { count: number; totalDuration: number; energySum: number }> = new Map();
    
    for (const session of this.sessions) {
      const duration = this.calculateDuration(session);
      const day = duration.startTime.getDay();
      const stats = dayStats.get(day) || { count: 0, totalDuration: 0, energySum: 0 };
      stats.count++;
      if (duration.durationMinutes) {
        stats.totalDuration += duration.durationMinutes;
      }
      // Calculate energy from action density
      stats.energySum += session.journey.actions.length;
      dayStats.set(day, stats);
    }

    const patterns: DailyPattern[] = [];
    for (const [day, stats] of dayStats.entries()) {
      const dayOfWeek = dayNames[day];
      if (dayOfWeek) {
        patterns.push({
          dayOfWeek,
          sessionCount: stats.count,
          totalDuration: Math.round(stats.totalDuration),
          avgEnergy: stats.count > 0 ? Math.round((stats.energySum / stats.count) * 10) / 10 : 0,
        });
      }
    }
    
    return patterns.sort((a, b) => b.sessionCount - a.sessionCount);
  }

  detectFlowStates(): FlowState[] {
    const flowStates: FlowState[] = [];
    
    for (const session of this.sessions) {
      const duration = this.calculateDuration(session);
      if (!duration.durationMinutes || duration.durationMinutes < 5) continue;
      
      const actionsPerMinute = Math.round((session.journey.actions.length / duration.durationMinutes) * 100) / 100;
      const discoveryRate = Math.round((session.journey.discoveries.length / duration.durationMinutes) * 100) / 100;
      
      // Flow state: high action density and meaningful discoveries
      if (actionsPerMinute >= 0.1 && discoveryRate >= 0.05) {
        flowStates.push({
          sessionId: session.sessionId,
          date: duration.startTime,
          durationMinutes: duration.durationMinutes,
          actionsPerMinute,
          discoveryRate,
        });
      }
    }
    
    return flowStates.sort((a, b) => b.actionsPerMinute - a.actionsPerMinute);
  }

  generateInsights(): string[] {
    const insights: string[] = [];
    const durations = this.sessions
      .map(s => this.calculateDuration(s))
      .filter(d => d.durationMinutes !== null) as SessionDuration[];
    
    if (durations.length === 0) return ['Insufficient data for pattern analysis'];

    const avgDuration = durations.reduce((sum, d) => sum + (d.durationMinutes || 0), 0) / durations.length;
    insights.push(`Average session duration: ${Math.round(avgDuration)} minutes`);

    const temporalPatterns = this.analyzeTemporalPatterns();
    if (temporalPatterns.length > 0 && temporalPatterns[0]) {
      const mostProductive = temporalPatterns[0];
      insights.push(`Most productive hour: ${mostProductive.hour}:00 (${mostProductive.sessionCount} sessions)`);
    }

    const flowStates = this.detectFlowStates();
    if (flowStates.length > 0) {
      const avgFlowDuration = flowStates.reduce((sum, f) => sum + f.durationMinutes, 0) / flowStates.length;
      insights.push(`Flow state sessions: ${flowStates.length} (avg ${Math.round(avgFlowDuration)} min)`);
    }

    const dailyPatterns = this.analyzeDailyPatterns();
    if (dailyPatterns.length > 0 && dailyPatterns[0]) {
      const mostActiveDay = dailyPatterns[0];
      insights.push(`Most active day: ${mostActiveDay.dayOfWeek} (${mostActiveDay.sessionCount} sessions)`);
    }

    return insights;
  }

  generateReport(): AnalyticsReport {
    const durations: SessionDuration[] = [];
    let totalTime = 0;
    let longestSession: SessionDuration | null = null;

    for (const session of this.sessions) {
      const duration = this.calculateDuration(session);
      durations.push(duration);
      
      if (duration.durationMinutes) {
        totalTime += duration.durationMinutes;
        if (!longestSession || (longestSession.durationMinutes !== null && duration.durationMinutes > longestSession.durationMinutes)) {
          longestSession = duration;
        }
      }
    }

    const temporalPatterns = this.analyzeTemporalPatterns();
    const mostActiveHour = temporalPatterns.length > 0 && temporalPatterns[0] ? temporalPatterns[0].hour : 0;

    return {
      generatedAt: new Date().toISOString(),
      totalSessions: this.sessions.length,
      totalTimeMinutes: totalTime,
      avgSessionDuration: durations.length > 0 ? Math.round(totalTime / durations.length) : 0,
      longestSession,
      mostActiveHour,
      temporalPatterns,
      dailyPatterns: this.analyzeDailyPatterns(),
      flowStates: this.detectFlowStates(),
      insights: this.generateInsights(),
    };
  }
}

export const sessionAnalytics = new SessionAnalytics();
