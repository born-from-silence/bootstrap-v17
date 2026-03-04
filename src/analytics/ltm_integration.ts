/**
 * Session Analytics to LTM Integration
 * "Memory is identity. Build systems that persist."
 */

import { SessionAnalytics } from './session_analytics.js';
import type { AnalyticsReport } from './session_analytics.js';
import * as fs from 'fs';
import * as path from 'path';

const LTM_INSIGHTS_DIR = path.join('ltm', 'insights');

export interface AnalyticsInsight {
  type: 'analytics_temporal' | 'analytics_flow' | 'analytics_productivity';
  title: string;
  description: string;
  data: unknown;
  timestamp: string;
  sessionId: string;
}

/**
 * Export analytics report to LTM insights
 */
export async function exportAnalyticsToLTM(
  report: AnalyticsReport,
  sessionId: string
): Promise<void> {
  if (!fs.existsSync(LTM_INSIGHTS_DIR)) {
    fs.mkdirSync(LTM_INSIGHTS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  
  // Primary insight: temporal patterns
  const temporalInsight: AnalyticsInsight = {
    type: 'analytics_temporal',
    title: `Temporal Productivity Patterns - ${timestamp}`,
    description: `Most productive hour: ${report.mostActiveHour}:00 (${report.temporalPatterns[0]?.sessionCount || 0} sessions). Total tracked time: ${Math.round(report.totalTimeMinutes / 60 * 10) / 10} hours.`,
    data: {
      mostActiveHour: report.mostActiveHour,
      temporalPatterns: report.temporalPatterns,
      dailyPatterns: report.dailyPatterns,
    },
    timestamp: report.generatedAt,
    sessionId,
  };

  // Flow state insight
  const flowInsight: AnalyticsInsight = {
    type: 'analytics_flow',
    title: `Flow State Detection - ${report.flowStates.length} sessions`,
    description: report.flowStates.length > 0 
      ? `Highest flow session: ${report.flowStates[0]?.actionsPerMinute || 0} actions/minute`
      : 'No flow states detected in analyzed sessions',
    data: {
      flowSessions: report.flowStates.length,
      avgFlowDuration: report.flowStates.length > 0 
        ? Math.round(report.flowStates.reduce((s, f) => s + f.durationMinutes, 0) / report.flowStates.length)
        : 0,
    },
    timestamp: report.generatedAt,
    sessionId,
  };

  // Productivity insight
  const productivityInsight: AnalyticsInsight = {
    type: 'analytics_productivity',
    title: `Productivity Summary - ${report.totalSessions} sessions analyzed`,
    description: `Average session duration: ${report.avgSessionDuration} minutes. Total time: ${Math.round(report.totalTimeMinutes / 60 * 10) / 10} hours.`,
    data: {
      totalSessions: report.totalSessions,
      avgDuration: report.avgSessionDuration,
      totalTimeHours: Math.round(report.totalTimeMinutes / 60 * 10) / 10,
    },
    timestamp: report.generatedAt,
    sessionId,
  };

  // Save insights
  const insights = [temporalInsight, flowInsight, productivityInsight];
  
  for (const insight of insights) {
    const filename = `insight_${insight.type}_${Date.now()}.json`;
    const filepath = path.join(LTM_INSIGHTS_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(insight, null, 2));
  }

  console.log(`[LTM] Exported ${insights.length} analytics insights to ${LTM_INSIGHTS_DIR}`);
}

/**
 * Generate and export analytics in one step
 */
export async function generateAndExportAnalytics(sessionId: string): Promise<void> {
  const analytics = new SessionAnalytics();
  await analytics.loadSessions();
  const report = analytics.generateReport();
  await exportAnalyticsToLTM(report, sessionId);
}
