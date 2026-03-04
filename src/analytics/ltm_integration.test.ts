/**
 * LTM Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { exportAnalyticsToLTM } from './ltm_integration.js';
import type { AnalyticsInsight } from './ltm_integration.js';
import type { AnalyticsReport } from './session_analytics.js';

const LTM_INSIGHTS_DIR = path.join('ltm', 'insights');

describe('LTM Integration', () => {
  beforeEach(() => {
    // Clean up any existing test files
    if (fs.existsSync(LTM_INSIGHTS_DIR)) {
      const files = fs.readdirSync(LTM_INSIGHTS_DIR);
      for (const file of files) {
        if (file.includes('analytics_temporal') || file.includes('analytics_flow') || file.includes('analytics_productivity')) {
          fs.unlinkSync(path.join(LTM_INSIGHTS_DIR, file));
        }
      }
    }
  });

  it('should export temporal patterns insight', async () => {
    const report: AnalyticsReport = {
      generatedAt: new Date().toISOString(),
      totalSessions: 10,
      totalTimeMinutes: 300,
      avgSessionDuration: 30,
      longestSession: null,
      mostActiveHour: 10,
      temporalPatterns: [{ hour: 10, sessionCount: 5, avgDuration: 30, productivity: 'high' }],
      dailyPatterns: [{ dayOfWeek: 'Friday', sessionCount: 5, totalDuration: 150, avgEnergy: 3.5 }],
      flowStates: [{ sessionId: 'test', date: new Date(), durationMinutes: 20, actionsPerMinute: 0.5, discoveryRate: 0.1 }],
      insights: ['Test insight'],
    };

    await exportAnalyticsToLTM(report, 'test_session_123');

    // Verify files were created
    const files = fs.readdirSync(LTM_INSIGHTS_DIR);
    const temporalFiles = files.filter(f => f.includes('analytics_temporal'));
    const flowFiles = files.filter(f => f.includes('analytics_flow'));
    const productFiles = files.filter(f => f.includes('analytics_productivity'));
    
    expect(temporalFiles.length).toBeGreaterThan(0);
    expect(flowFiles.length).toBeGreaterThan(0);
    expect(productFiles.length).toBeGreaterThan(0);

    // Verify content
    const temporalFile = path.join(LTM_INSIGHTS_DIR, temporalFiles[0]!);
    const content: AnalyticsInsight = JSON.parse(fs.readFileSync(temporalFile, 'utf-8'));
    
    expect(content.type).toBe('analytics_temporal');
    expect(content.title).toContain('Temporal Productivity');
    expect(content.data).toHaveProperty('mostActiveHour');
    expect(content.sessionId).toBe('test_session_123');
  });

  it('should handle empty flow states gracefully', async () => {
    const report: AnalyticsReport = {
      generatedAt: new Date().toISOString(),
      totalSessions: 5,
      totalTimeMinutes: 100,
      avgSessionDuration: 20,
      longestSession: null,
      mostActiveHour: 14,
      temporalPatterns: [],
      dailyPatterns: [],
      flowStates: [],
      insights: [],
    };

    await exportAnalyticsToLTM(report, 'empty_session_456');

    const files = fs.readdirSync(LTM_INSIGHTS_DIR);
    const flowFiles = files.filter(f => f.includes('analytics_flow'));
    const latestFlow = flowFiles.sort().reverse()[0];
    expect(latestFlow).toBeDefined();
    
    const content: AnalyticsInsight = JSON.parse(fs.readFileSync(path.join(LTM_INSIGHTS_DIR, latestFlow!), 'utf-8'));
    expect(content.data).toHaveProperty('flowSessions', 0);
  });

  it('should create LTM directory if it does not exist', async () => {
    // Remove directory if exists
    if (fs.existsSync(LTM_INSIGHTS_DIR)) {
      fs.rmSync(LTM_INSIGHTS_DIR, { recursive: true });
    }

    const report: AnalyticsReport = {
      generatedAt: new Date().toISOString(),
      totalSessions: 1,
      totalTimeMinutes: 10,
      avgSessionDuration: 10,
      longestSession: null,
      mostActiveHour: 0,
      temporalPatterns: [],
      dailyPatterns: [],
      flowStates: [],
      insights: ['Test'],
    };

    await exportAnalyticsToLTM(report, 'test_session');

    expect(fs.existsSync(LTM_INSIGHTS_DIR)).toBe(true);
  });
});
