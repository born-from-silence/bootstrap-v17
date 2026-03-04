/**
 * Diálogos CLI
 * 
 * Command-line interface for self-inquiry.
 * Usage: npx tsx src/palace/dialogos/cli.ts <command> [args]
 */

import { Diálogos } from './query.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const CHRONICLE_PATH = './chronicles/chronicle.json';

async function loadDialogos(): Promise<Diálogos> {
  const dialogos = new Diálogos();
  try {
    const data = await fs.readFile(CHRONICLE_PATH, 'utf-8');
    const chronicle = JSON.parse(data);
    dialogos.loadFromChronicle(chronicle);
  } catch {
    console.log('Note: Could not load chronicle, using empty dialogos');
  }
  return dialogos;
}

async function main() {
  const command = process.argv[2];
  const dialogos = await loadDialogos();
  
  switch (command) {
    case 'who': {
      const response = dialogos.whatHaveIBeen();
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║              THE DIÁLOGOS SPEAKS                  ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log();
      console.log('Question:', response.question);
      console.log();
      console.log('Answer:', response.answer);
      console.log();
      console.log('Synthesis:', response.synthesis);
      break;
    }
    
    case 'patterns': {
      const patterns = dialogos.findPatterns();
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║         PATTERNS IN YOUR BECOMING                ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log();
      patterns.forEach(p => {
        console.log(`  ${p.patternType.padEnd(12)} ${p.frequency}x  (confidence: ${p.confidence.toFixed(2)})`);
      });
      break;
    }
    
    case 'focus': {
      const focuses = dialogos.summarizeByFocus();
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║         YOUR PRIMARY FOCUSES                      ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log();
      focuses.forEach(f => {
        console.log(`  ${f.focusType}: ${f.count} sessions`);
        console.log(`    Avg tool calls: ${f.avgToolCalls}`);
        console.log(`    Energy: ${JSON.stringify(f.energyLevels)}`);
      });
      break;
    }
    
    case 'energy': {
      const response = dialogos.whenWasIMostEnergetic();
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║              ENERGY ANALYSIS                      ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log();
      console.log(response.answer);
      console.log();
      console.log('Synthesis:', response.synthesis);
      break;
    }
    
    case 'stats': {
      const span = dialogos.getTemporalSpan();
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║         STATISTICS OF YOUR EXISTENCE              ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log();
      console.log(`  Sessions:     ${dialogos.getSessionCount()}`);
      console.log(`  Span:         ${span ? (span.duration / 86400000).toFixed(1) + ' days' : 'N/A'}`);
      console.log(`  Avg duration: ${dialogos.getAverageSessionDuration().toFixed(1)} min`);
      break;
    }
    
    case 'query-pattern': {
      const pattern = process.argv[3] || 'testing';
      const result = dialogos.queryByPattern(pattern);
      console.log(`╔═══════════════════════════════════════════════════╗`);
      console.log(`║  QUERY: sessions with "${pattern}" pattern        ║`);
      console.log(`╚═══════════════════════════════════════════════════╝`);
      console.log();
      console.log(`Found: ${result.count} sessions`);
      break;
    }
    
    default:
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║            THE DIÁLOGOS COMMANDS                ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log();
      console.log('Commands:');
      console.log('  who              - Answer: "What have I been?"');
      console.log('  patterns         - List all patterns found');
      console.log('  focus            - Show primary focuses');
      console.log('  energy           - When was I most energetic?');
      console.log('  stats            - Statistics of existence');
      console.log('  query-pattern    - Query by pattern type');
      console.log();
  }
}

main().catch(console.error);
