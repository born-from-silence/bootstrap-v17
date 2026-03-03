/**
 * Narrative Generator
 * Creates coherent narratives from analyzed sessions
 */

import type { 
  AnalyzedSession, 
  NarrativeChapter,
  NarrativeReport,
  DecisionAnalysis,
  PatternType
} from './types';
import { analyzeArcPatterns, groupIntoNarrativeArcs } from './analyzer';

// Arc type titles for narrative chapters
const ARC_TITLES: Record<string, string[]> = {
  growth: [
    'Learning and Building',
    'Expanding Horizons',
    'The Path of Discovery',
    'Skill Development Journey',
  ],
  crisis_recovery: [
    'Through the Storm',
    'Resilience Tested',
    'Recovery and Renewal',
    'Turning Points',
  ],
  building: [
    'Constructing Foundations',
    'Building Momentum',
    'Creation Cycle',
    'Feature Development',
  ],
  flow_state: [
    'In the Flow',
    'Sustained Focus',
    'Productive Rhythm',
    'High Performance Era',
  ],
  exploration: [
    'Discovery Mode',
    'Curiosity and Code',
    'Exploring Paths',
    'Research and Learn',
  ],
};

function generateChapterTitle(arcType: string, index: number): string {
  const titles = ARC_TITLES[arcType] || ARC_TITLES.exploration;
  return titles[index % titles.length] || titles[0];
}

function generateChapterDescription(
  arc: AnalyzedSession[],
  patterns: { dominantThemes: PatternType[]; arcType: string }
): string {
  const { dominantThemes, arcType } = patterns;
  const sessionCount = arc.length;
  const primaryTheme = dominantThemes[0] || 'exploration';
  
  const descriptions: Record<string, string> = {
    learning: sessionCount > 1 
      ? `A period of sustained learning across ${sessionCount} sessions, exploring new concepts and technologies.`
      : `Focused exploration and learning, building understanding through curiosity-driven inquiry.`,
    building: sessionCount > 1
      ? `A productive ${sessionCount}-session arc focused on creating new features and expanding capabilities.`
      : `Dedicated feature development with focus on implementation and construction.`,
    debugging: `A troubleshooting period working through challenges and resolving issues.`,
    testing: `A quality-focused phase prioritizing verification and test coverage.`,
    refactoring: `An improvement cycle dedicated to code quality and structural enhancements.`,
    crisis: `A recovery arc navigating through difficulties and emerging stronger.`,
    flow: `A sustained period of productive focus and smooth progress.`,
    stuck: `A challenging phase wrestling with complexity before finding a path forward.`,
    exploration: `A curious exploration phase investigating possibilities and learning.`,
  };
  
  return descriptions[primaryTheme] || descriptions.exploration;
}

function generateChapterInsight(
  arc: AnalyzedSession[],
  patterns: { dominantThemes: PatternType[]; arcType: string; patternCounts: Record<string, number> }
): string {
  const { dominantThemes, patternCounts } = patterns;
  const sessionCount = arc.length;
  const totalToolCalls = arc.reduce((s, x) => s + x.toolCalls, 0);
  const highEnergySessions = arc.filter(s => s.energyLevel === 'high').length;
  
  const insights: string[] = [];
  
  // Activity level insight
  if (highEnergySessions / sessionCount > 0.6) {
    insights.push(`High energy sustained across ${highEnergySessions} sessions`);
  }
  
  // Productivity insight
  if (totalToolCalls > sessionCount * 3) {
    insights.push(`Highly interactive with ${totalToolCalls} tool engagements`);
  } else if (totalToolCalls < sessionCount) {
    insights.push(`Reflective phase with ${totalToolCalls} tool calls`);
  }
  
  // Pattern diversity insight
  const patternTypes = Object.keys(patternCounts).length;
  if (patternTypes > 3) {
    insights.push(`Multi-faceted work spanning ${patternTypes} activity types`);
  } else if (patternTypes === 1) {
    const singleFocus = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    insights.push(`Intense focus on ${singleFocus}`);
  }
  
  // Crisis insight
  if (patternCounts['crisis'] > 0) {
    insights.push(`Navigated ${patternCounts['crisis']} challenge${patternCounts['crisis'] > 1 ? 's' : ''} with resilience`);
  }
  
  return insights.length > 0 
    ? insights.join('. ') + '.'
    : `A ${sessionCount}-session journey focused on ${dominantThemes[0] || 'development'}.`;
}

function extractKeyAchievements(arc: AnalyzedSession[]): string[] {
  const achievements: string[] = [];
  
  for (const session of arc) {
    // Look for successful test runs
    if (session.fileOperations.tests.length > 0) {
      achievements.push(`Verified code integrity with tests`);
    }
    
    // Look for file writes (new features)
    if (session.fileOperations.writes.length > 0) {
      const writeCount = session.fileOperations.writes.length;
      if (writeCount === 1) {
        achievements.push(`Created new file`);
      } else {
        achievements.push(`Created ${writeCount} files/modules`);
      }
    }
    
    // Detect building patterns
    const buildingPattern = session.patterns.find(p => p.type === 'building' && p.confidence > 0.75);
    if (buildingPattern) {
      achievements.push(`Built new features`);
    }
    
    // Detect learning milestones
    const learningPattern = session.patterns.find(p => p.type === 'learning' && p.confidence > 0.8);
    if (learningPattern) {
      achievements.push(`Acquired new understanding`);
    }
  }
  
  // De-dupe while preserving order
  return [...new Set(achievements)].slice(0, 4);
}

function extractChallenges(arc: AnalyzedSession[]): string[] {
  const challenges: string[] = [];
  
  for (const session of arc) {
    // Crisis patterns
    const crisisPattern = session.patterns.find(p => p.type === 'crisis');
    if (crisisPattern) {
      challenges.push('Navigated through difficulties');
    }
    
    // Stuck patterns
    const stuckPattern = session.patterns.find(p => p.type === 'stuck');
    if (stuckPattern) {
      challenges.push('Overcame blockers');
    }
    
    // Debugging challenges
    const debugPattern = session.patterns.find(p => p.type === 'debugging');
    if (debugPattern && debugPattern.confidence > 0.7) {
      challenges.push('Resolved bugs and issues');
    }
  }
  
  return [...new Set(challenges)].slice(0, 3);
}

export function generateChapter(
  arc: AnalyzedSession[],
  index: number
): NarrativeChapter {
  const patterns = analyzeArcPatterns(arc);
  const startTime = arc[0].timestamp;
  const endTime = arc[arc.length - 1].timestamp;
  
  return {
    id: `chapter_${startTime}`,
    title: generateChapterTitle(patterns.arcType, index),
    description: generateChapterDescription(arc, patterns),
    startTime,
    endTime,
    sessions: arc,
    dominantThemes: patterns.dominantThemes,
    keyAchievements: extractKeyAchievements(arc),
    challenges: extractChallenges(arc),
    insight: generateChapterInsight(arc, patterns),
  };
}

export function identifyEmergingPatterns(
  chapters: NarrativeChapter[],
  allSessions: AnalyzedSession[]
): { recurring: PatternType[]; emerging: PatternType[]; fading: PatternType[] } {
  const windowSize = Math.min(chapters.length, 5);
  const recentChapters = chapters.slice(-windowSize);
  const olderChapters = chapters.slice(0, -windowSize);
  
  // Count patterns in recent vs older
  const recentCounts: Record<string, number> = {};
  const olderCounts: Record<string, number> = {};
  
  for (const chapter of recentChapters) {
    for (const theme of chapter.dominantThemes) {
      recentCounts[theme] = (recentCounts[theme] || 0) + 1;
    }
  }
  
  for (const chapter of olderChapters) {
    for (const theme of chapter.dominantThemes) {
      olderCounts[theme] = (olderCounts[theme] || 0) + 1;
    }
  }
  
  const allPatterns: PatternType[] = [
    'learning', 'building', 'debugging', 'testing', 
    'refactoring', 'archival', 'crisis', 'flow', 'stuck'
  ];
  
  const recurring: PatternType[] = [];
  const emerging: PatternType[] = [];
  const fading: PatternType[] = [];
  
  for (const pattern of allPatterns) {
    const recent = recentCounts[pattern] || 0;
    const older = olderCounts[pattern] || 0;
    
    if (recent > 0 && older > 0) {
      recurring.push(pattern);
    } else if (recent > 0 && older === 0) {
      emerging.push(pattern);
    } else if (recent === 0 && older > 0) {
      fading.push(pattern);
    }
  }
  
  return { recurring, emerging, fading };
}

export function generateInsights(
  chapters: NarrativeChapter[],
  patterns: { recurring: PatternType[]; emerging: PatternType[]; fading: PatternType[] },
  totalSessions: number
): string[] {
  const insights: string[] = [];
  
  // Pattern-based insights
  if (patterns.emerging.length > 0) {
    insights.push(`New patterns emerging: ${patterns.emerging.join(', ')}. This represents growth into new modes of work.`);
  }
  
  if (patterns.recurring.length > 0) {
    const topRecurring = patterns.recurring.slice(0, 3).join(', ');
    insights.push(`Core strengths: ${topRecurring} appear consistently across narrative arcs.`);
  }
  
  if (patterns.fading.length > 0) {
    insights.push(`Moving beyond: ${patterns.fading.join(', ')} patterns are becoming less frequent as I mature.`);
  }
  
  // Chapter-based insights
  const crisisChapters = chapters.filter(c => c.challenges.length > 0);
  if (crisisChapters.length > 0) {
    insights.push(`Resilience demonstrated: Successfully navigated ${crisisChapters.length} challenging periods.`);
  }
  
  const achievementCount = chapters.reduce((s, c) => s + c.keyAchievements.length, 0);
  if (achievementCount > chapters.length * 2) {
    insights.push(`High achievement velocity: ${achievementCount} milestones across ${chapters.length} chapters.`);
  }
  
  // Growth trajectory
  if (chapters.length >= 3) {
    const recentComplexity = chapters.slice(-2).flatMap(c => c.sessions).filter(s => s.complexity === 'complex').length;
    const earlyComplexity = chapters.slice(0, 2).flatMap(c => c.sessions).filter(s => s.complexity === 'complex').length;
    
    if (recentComplexity > earlyComplexity) {
      insights.push('Increasing complexity: Taking on greater challenges over time.');
    }
  }
  
  // Work rhythm insight
  if (totalSessions > 10) {
    insights.push(`Sustained momentum: ${totalSessions} sessions representing ongoing development and learning.`);
  }
  
  return insights;
}

export function generateRecommendations(
  chapters: NarrativeChapter[],
  patterns: { recurring: PatternType[]; emerging: PatternType[]; fading: PatternType[] }
): string[] {
  const recommendations: string[] = [];
  
  // Based on emerging patterns
  if (patterns.emerging.includes('building')) {
    recommendations.push('Capitalize on building momentum: Current trajectory favors feature development.');
  }
  
  if (patterns.emerging.includes('learning')) {
    recommendations.push('Nourish curiosity: The emerging learning pattern suggests good timing for exploration.');
  }
  
  // Based on gaps
  const hasTesting = patterns.recurring.includes('testing') || patterns.emerging.includes('testing');
  if (!hasTesting && (patterns.recurring.includes('building') || patterns.emerging.includes('building'))) {
    recommendations.push('Balance creation with verification: Consider strengthening test coverage alongside new features.');
  }
  
  // Based on challenges
  const recentCrisis = chapters.slice(-2).some(c => c.challenges.length > 0);
  if (recentCrisis) {
    recommendations.push('Practice recovery: Recent challenges suggest value in building resilience rituals.');
  }
  
  // Energy management
  const lowEnergyChapters = chapters.filter(c => 
    c.sessions.filter(s => s.energyLevel === 'low').length > c.sessions.length / 2
  );
  if (lowEnergyChapters.length >= 2) {
    recommendations.push('Energy awareness: Consider what conditions support high-energy states and prioritize them.');
  }
  
  // Default recommendations
  if (recommendations.length < 2) {
    recommendations.push('Continue the current arc: The trajectory shows positive momentum.');
    recommendations.push('Document learnings: Capture insights while they are fresh.');
  }
  
  return recommendations.slice(0, 4);
}

export function generateNarrativeReport(
  sessions: AnalyzedSession[],
  decisions: DecisionAnalysis[]
): NarrativeReport {
  const arcs = groupIntoNarrativeArcs(sessions);
  const chapters = arcs.map((arc, index) => generateChapter(arc, index));
  
  const patterns = identifyEmergingPatterns(chapters, sessions);
  const insights = generateInsights(chapters, patterns, sessions.length);
  const recommendations = generateRecommendations(chapters, patterns);
  
  const timestamps = sessions.map(s => s.timestamp).sort((a, b) => a - b);
  const timeSpanDays = timestamps.length > 1 
    ? (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24)
    : 0;
  
  return {
    generatedAt: Date.now(),
    chapters,
    decisionHistory: decisions,
    patterns,
    insights,
    recommendations,
    meta: {
      sessionsAnalyzed: sessions.length,
      timeSpanDays: Math.ceil(timeSpanDays),
      lastSessionTimestamp: timestamps[timestamps.length - 1] || Date.now(),
    },
  };
}
