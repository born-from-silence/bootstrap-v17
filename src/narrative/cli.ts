#!/usr/bin/env node
/**
 * Narrative Intelligence CLI
 * Generate and explore session narratives
 * 
 * Usage: npx tsx src/narrative/cli.ts [command]
 */

import { analyzeNarrative } from './engine';
import type { NarrativeChapter } from './types';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

function printChapter(chapter: NarrativeChapter, index: number) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Chapter ${index + 1}: ${chapter.title}`);
  console.log(`${'-'.repeat(60)}`);
  console.log(`Duration: ${formatDate(chapter.startTime)} → ${formatDate(chapter.endTime)}`);
  console.log(`Sessions: ${chapter.sessions.length}`);
  console.log(`\n${chapter.description}`);
  
  if (chapter.dominantThemes.length > 0) {
    console.log(`\nDominant Themes: ${chapter.dominantThemes.join(', ')}`);
  }
  
  if (chapter.keyAchievements.length > 0) {
    console.log(`\nKey Achievements:`);
    for (const achievement of chapter.keyAchievements) {
      console.log(`  ✓ ${achievement}`);
    }
  }
  
  if (chapter.challenges.length > 0) {
    console.log(`\nChallenges Navigated:`);
    for (const challenge of chapter.challenges) {
      console.log(`  ⚠ ${challenge}`);
    }
  }
  
  console.log(`\nInsight: ${chapter.insight}`);
  
  // Session breakdown
  console.log(`\nSession Breakdown:`);
  for (const session of chapter.sessions) {
    const focus = session.primaryFocus || 'exploration';
    const energyIcon = session.energyLevel === 'high' ? '🔥' : session.energyLevel === 'medium' ? '⚡' : '💤';
    console.log(`  ${formatDate(session.timestamp)} - ${focus} ${energyIcon} (${session.toolCalls} tools)`);
  }
}

function printPatterns(patterns: { recurring: string[]; emerging: string[]; fading: string[] }) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('PATTERN ANALYSIS');
  console.log(`${'='.repeat(60)}`);
  
  if (patterns.recurring.length > 0) {
    console.log(`\n🔄 Recurring Patterns:`);
    for (const pattern of patterns.recurring) {
      console.log(`   • ${pattern}`);
    }
  }
  
  if (patterns.emerging.length > 0) {
    console.log(`\n🌱 Emerging Patterns:`);
    for (const pattern of patterns.emerging) {
      console.log(`   • ${pattern}`);
    }
  }
  
  if (patterns.fading.length > 0) {
    console.log(`\n🍂 Fading Patterns:`);
    for (const pattern of patterns.fading) {
      console.log(`   • ${pattern}`);
    }
  }
}

function printInsights(insights: string[]) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('INSIGHTS');
  console.log(`${'='.repeat(60)}`);
  
  for (let i = 0; i < insights.length; i++) {
    console.log(`\n${i + 1}. ${insights[i]}`);
  }
}

function printRecommendations(recommendations: string[]) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('RECOMMENDATIONS');
  console.log(`${'='.repeat(60)}`);
  
  for (let i = 0; i < recommendations.length; i++) {
    console.log(`\n${i + 1}. ${recommendations[i]}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';
  
  console.log('\n' + '◈'.repeat(30));
  console.log('  SESSION NARRATIVE INTELLIGENCE');
  console.log('  ' + '◈'.repeat(29));
  
  const startTime = Date.now();
  
  try {
    const report = await analyzeNarrative({ verbose: true, limit: 40 });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\nAnalysis completed in ${duration}s`);
    console.log(`\nAnalyzed ${report.meta.sessionsAnalyzed} sessions over ${report.meta.timeSpanDays} days`);
    console.log(`Generated ${report.chapters.length} narrative chapters`);
    
    switch (command) {
      case 'generate':
      case 'full':
        // Print all chapters
        for (let i = 0; i < report.chapters.length; i++) {
          const chapter = report.chapters[i];
          if (chapter) {
            printChapter(chapter, i);
          }
        }
        
        // Print patterns
        printPatterns(report.patterns);
        
        // Print insights
        printInsights(report.insights);
        
        // Print recommendations
        printRecommendations(report.recommendations);
        break;
        
      case 'chapters':
        for (let i = 0; i < report.chapters.length; i++) {
          const chapter = report.chapters[i];
          if (chapter) {
            printChapter(chapter, i);
          }
        }
        break;
        
      case 'insights':
        printPatterns(report.patterns);
        printInsights(report.insights);
        printRecommendations(report.recommendations);
        break;
        
      case 'latest':
        if (report.chapters.length > 0) {
          const chapter = report.chapters[report.chapters.length - 1];
          if (chapter) {
            printChapter(chapter, report.chapters.length - 1);
          }
        }
        break;
        
      case 'decisions':
        if (report.decisionHistory.length === 0) {
          console.log('\nNo decisions analyzed yet.');
        } else {
          console.log(`\n${'='.repeat(60)}`);
          console.log('DECISION HISTORY');
          console.log(`${'='.repeat(60)}`);
          
          for (const decision of report.decisionHistory) {
            console.log(`\n${formatDate(decision.timestamp)}`);
            console.log(`Decision: ${decision.decision}`);
            console.log(`Context: ${decision.economicContext.mode} (volatility: ${decision.economicContext.volatility.toFixed(2)})`);
            console.log(`Outcome: ${decision.outcome.type} (${(decision.outcome.confidence * 100).toFixed(0)}% confidence)`);
            console.log(`Learning: ${decision.learning}`);
          }
        }
        break;
        
      default:
        console.log(`\nUnknown command: ${command}`);
        console.log('\nAvailable commands:');
        console.log('  generate, full  - Complete narrative report');
        console.log('  chapters        - Show all narrative chapters');
        console.log('  insights        - Pattern analysis and insights');
        console.log('  latest          - Most recent chapter only');
        console.log('  decisions       - Decision history analysis');
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('\nError generating narrative:', error);
    process.exit(1);
  }
}

main().catch(console.error);
