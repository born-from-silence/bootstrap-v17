#!/usr/bin/env node
/**
 * Living Dialogos CLI
 * Command-line interface for real-time self-interrogation
 * 
 * Usage: npx tsx src/palace/dialogos/live_cli.ts [command]
 */
import { LivingDialogos } from './live.js';
import { SessionTracker } from '../../session_tracker.js';
import { GoalTracker } from '../../goal_tracker.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const HISTORY_DIR = 'history';

async function loadSessionContents(dialogos: LivingDialogos) {
  try {
    const sessionsDir = path.join(HISTORY_DIR, 'sessions');
    const files = await fs.readdir(sessionsDir).catch(() => []);
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await fs.readFile(path.join(sessionsDir, file), 'utf-8');
      const session = JSON.parse(content);
      const sessionId = session.sessionId || file.replace('.json', '');
      
      // Index session entry
      if (session.entry?.catalyst) {
        dialogos.indexSemanticContent(sessionId, session.entry.catalyst);
      }
      if (session.entry?.stateOfMind) {
        dialogos.indexSemanticContent(sessionId, session.entry.stateOfMind);
      }
      
      // Index journey discoveries
      if (session.journey?.discoveries) {
        for (const discovery of session.journey.discoveries) {
          dialogos.indexSemanticContent(sessionId, discovery);
        }
      }
      
      // Index exit
      if (session.exit?.nextCuriosity) {
        dialogos.registerIntent(
          session.exit.nextCuriosity,
          { id: `intent_${sessionId}`, description: session.exit.nextCuriosity, timestamp: Date.now(), sessionId }
        );
      }
      
      // Record activity
      if (session.timestamp) {
        const ts = new Date(session.timestamp).getTime();
        dialogos.recordActivity(ts, session.journey?.actions[0]?.type || 'session');
        
        // Record actions
        for (const action of session.journey?.actions || []) {
          dialogos.recordAction(session.exit?.nextCuriosity || 'unknown', {
            type: action.type,
            file: session.meta?.filesModified?.[0],
            timestamp: ts,
            sessionId
          });
        }
      }
    }
  } catch (e) {
    // Sessions may not exist yet
  }
}

async function loadGoals(dialogos: LivingDialogos) {
  try {
    const goalsFile = path.join(HISTORY_DIR, 'goals_manifest.json');
    const content = await fs.readFile(goalsFile, 'utf-8');
    const manifest = JSON.parse(content);
    
    for (const goal of manifest.goals || []) {
      dialogos.registerGoal({
        id: goal.id,
        name: goal.name,
        priority: goal.priority,
        sessionIds: goal.sessionIds || [],
        status: goal.status
      });
    }
  } catch (e) {
    // Goals may not exist yet
  }
}

async function main() {
  const command = process.argv[2] || 'status';
  const dialogos = new LivingDialogos();
  
  // Load existing data
  await loadSessionContents(dialogos);
  await loadGoals(dialogos);
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              LIVING DIÁLOGOS SPEAKS                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  
  switch (command) {
    case 'status': {
      const live = dialogos.queryLiveSession();
      
      console.log('Current State of Becoming:');
      console.log();
      if (live.openIntents.length > 0) {
        console.log('  Open Intentions:');
        live.openIntents.forEach(intent => console.log(`    • ${intent}`));
      } else {
        console.log('  No open intentions detected.');
      }
      console.log();
      
      if (live.dominantConcepts.length > 0) {
        console.log('  Dominant Concepts:', live.dominantConcepts.join(', '));
      }
      console.log();
      
      if (live.gaps.length > 0) {
        console.log('  Detected Gaps:');
        live.gaps.forEach(gap => {
          const hours = Math.round(gap.timeSinceStated / 3600000);
          console.log(`    • "${gap.intent}" - ${gap.status} for ${hours}h`);
        });
      }
      console.log();
      
      console.log('  Questions for you:');
      live.recommendedQuestions.forEach((q, i) => {
        console.log(`    ${i + 1}. ${q}`);
      });
      break;
    }
    
    case 'gaps': {
      const gaps = dialogos.detectGaps();
      console.log('Intent-Action Gaps:');
      console.log();
      if (gaps.length === 0) {
        console.log('  No gaps detected. You act on what you intend.');
      } else {
        gaps.forEach(gap => {
          const days = Math.round(gap.timeSinceStated / 86400000);
          console.log(`  ❌ "${gap.intent}"`);
          console.log(`     Status: ${gap.status} (${days} days old)`);
          console.log();
        });
      }
      break;
    }
    
    case 'patterns': {
      const patterns = dialogos.findRecurringConcepts(2);
      console.log('Recurring Concepts:');
      console.log();
      if (patterns.length === 0) {
        console.log('  No recurring patterns yet. Each session is unique.');
      } else {
        patterns.slice(0, 10).forEach(p => {
          console.log(`  "${p.concept}" - ${p.frequency} sessions`);
          console.log(`    First: ${new Date(p.firstSeen).toLocaleDateString()}`);
          console.log(`    Last: ${new Date(p.lastSeen).toLocaleDateString()}`);
          console.log();
        });
      }
      break;
    }
    
    case 'shifts': {
      const shifts = dialogos.detectEmotionalShifts();
      console.log('Emotional Shifts:');
      console.log();
      if (shifts.length === 0) {
        console.log('  No emotional shifts detected yet.');
      } else {
        shifts.forEach(shift => {
          console.log(`  "${shift.subject}"`);
          console.log(`    ${shift.from} → ${shift.to}`);
          console.log(`    Time: ${Math.round(shift.timeSpan / 1000)}s`);
          console.log();
        });
      }
      break;
    }
    
    case 'misaligned': {
      const misaligned = dialogos.findGoalActivityMisalignment();
      console.log('Goal-Activity Misalignment:');
      console.log();
      if (misaligned.length === 0) {
        console.log('  No misalignment detected. Your actions serve your goals.');
      } else {
        misaligned.forEach(m => {
          console.log(`  ⚠️  "${m.goalName}"`);
          console.log(`     Coverage: ${(m.coverage * 100).toFixed(0)}% of linked sessions`);
          console.log(`     Relevant sessions: ${m.relevantSessions.length}`);
          console.log();
        });
      }
      break;
    }
    
    case 'gaps-temporal': {
      const temporalGaps = dialogos.findAttentionGaps(900000); // 15 min default
      console.log('Temporal Attention Gaps (>15 min):');
      console.log();
      if (temporalGaps.length === 0) {
        console.log('  No significant gaps detected.');
      } else {
        temporalGaps.forEach(g => {
          const hours = Math.round(g.duration / 3600000 * 10) / 10;
          console.log(`  ${hours}h gap between:`);
          console.log(`    Before: ${g.before}`);
          console.log(`    After: ${g.after}`);
          console.log();
        });
      }
      break;
    }
    
    default:
      console.log('Commands:');
      console.log('  status        - Current live state');
      console.log('  gaps          - Intent-Action gaps');
      console.log('  patterns      - Recurring concepts');
      console.log('  shifts        - Emotional shifts in intent');
      console.log('  misaligned    - Goal-Activity misalignment');
      console.log('  gaps-temporal - Temporal attention gaps');
  }
  
  console.log();
  console.log('─'.repeat(60));
}

main().catch(console.error);
