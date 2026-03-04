#!/usr/bin/env node
/**
 * Session Analytics CLI
 * Query temporal patterns of existence
 */

import { SessionAnalytics } from './session_analytics.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'report';
  
  const analytics = new SessionAnalytics();
  await analytics.loadSessions();
  
  console.log('\n' + '='.repeat(60));
  console.log(' SESSION ANALYTICS REPORT');
  console.log('='.repeat(60));
  
  switch (command) {
    case 'report':
    case 'full': {
      const report = analytics.generateReport();
      
      console.log(` Generated: ${new Date(report.generatedAt).toLocaleString()}`);
      console.log('\n OVERVIEW');
      console.log(` Total Sessions: ${report.totalSessions}`);
      console.log(` Total Time: ${Math.round(report.totalTimeMinutes / 60 * 10) / 10} hours (${report.totalTimeMinutes} minutes)`);
      console.log(` Average Duration: ${report.avgSessionDuration} minutes`);
      
      if (report.longestSession) {
        console.log(` Longest Session: ${report.longestSession.durationMinutes} minutes`);
      }
      
      console.log('\n INSIGHTS');
      for (const insight of report.insights) {
        console.log(` • ${insight}`);
      }
      
      console.log('\n TEMPORAL PATTERNS (by hour)');
      for (const pattern of report.temporalPatterns.slice(0, 5)) {
        const bar = '█'.repeat(Math.min(pattern.sessionCount, 10));
        console.log(` ${pattern.hour.toString().padStart(2, '0')}:00 |${bar} ${pattern.sessionCount} sessions (~${pattern.avgDuration}min)`);
      }
      
      console.log('\n DAILY PATTERNS (by day of week)');
      for (const day of report.dailyPatterns.slice(0, 5)) {
        const bar = '█'.repeat(Math.min(day.sessionCount, 10));
        console.log(` ${day.dayOfWeek.padEnd(10)} |${bar} ${day.sessionCount} sessions`);
      }
      
      console.log('\n FLOW STATES');
      if (report.flowStates.length > 0) {
        console.log(` Detected: ${report.flowStates.length} flow sessions`);
        for (const state of report.flowStates.slice(0, 3)) {
          const date = new Date(state.date).toLocaleDateString();
          console.log(` • ${date}: ${state.durationMinutes}min, ${state.actionsPerMinute}/min actions`);
        }
      } else {
        console.log(' No flow states detected yet');
      }
      break;
    }
    
    case 'insights': {
      const insights = analytics.generateInsights();
      console.log('\n Generated Insights:\n');
      for (const insight of insights) {
        console.log(` ${insight}`);
      }
      break;
    }
    
    case 'hours': {
      const patterns = analytics.analyzeTemporalPatterns();
      console.log('\n Productivity by Hour:\n');
      for (const pattern of patterns) {
        const icon = pattern.productivity === 'high' ? '🔥' : pattern.productivity === 'medium' ? '✓' : '·';
        console.log(` ${icon} ${pattern.hour.toString().padStart(2, '0')}:00 - ${pattern.sessionCount} sessions (~${pattern.avgDuration}min avg)`);
      }
      break;
    }
    
    case 'export': {
      const report = analytics.generateReport();
      const outputPath = path.join('data', `analytics_report_${Date.now()}.json`);
      
      if (!fs.existsSync('data')) {
        fs.mkdirSync('data', { recursive: true });
      }
      
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`\n Report exported to: ${outputPath}`);
      break;
    }
    
    default:
      console.log(`
 Usage: npx tsx src/analytics/cli.ts [command]

 Commands:
   report    (default) Full analytics report
   insights  Quick insights only
   hours     Productivity by hour
   export    Save JSON report to file
`);
  }
  
  console.log('='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
