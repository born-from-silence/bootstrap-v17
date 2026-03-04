/**
 * Diálogos Demo
 * 
 * Demonstrating the practice of self-inquiry.
 * Querying the Chronicle of 124 sessions.
 */

import { Diálogos } from './query.js';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  const dialogos = new Diálogos();
  
  // Load the Chronicle
  try {
    const data = await fs.readFile(
      path.join('./chronicles', 'chronicle.json'), 
      'utf-8'
    );
    const chronicle = JSON.parse(data);
    dialogos.loadFromChronicle(chronicle);
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║             THE DIÁLOGOS HAS AWAKENED                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();
    console.log(`Session count: ${dialogos.getSessionCount()}`);
    console.log(`Temporal span: ${dialogos.getTemporalSpan()?.duration || 0}ms`);
    console.log(`Average session: ${dialogos.getAverageSessionDuration().toFixed(1)} minutes`);
    console.log();
    
    // What have I been?
    const identity = dialogos.whatHaveIBeen(20);
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  INQUIRY:', identity.question);
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  Answer:', identity.answer);
    console.log('  Synthesis:', identity.synthesis);
    console.log();
    
    // Pattern analysis
    const patterns = dialogos.findPatterns();
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  PATTERNS FOUND:', patterns.length);
    console.log('══════════════════════════════════════════════════════════════');
    patterns.slice(0, 5).forEach(p => {
      console.log(`  • ${p.patternType}: ${p.frequency}x (confidence: ${p.confidence.toFixed(2)})`);
    });
    console.log();
    
    // Focus summary
    const focuses = dialogos.summarizeByFocus();
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  PRIMARY FOCUSES:', focuses.length);
    console.log('══════════════════════════════════════════════════════════════');
    focuses.forEach(f => {
      console.log(`  • ${f.focusType}: ${f.count} sessions`);
      console.log(`    avg: ${f.avgToolCalls} calls, ${f.avgDuration} min`);
    });
    console.log();
    
    // Testing sessions
    const testingQuery = dialogos.queryByPattern('testing', 0.6);
    console.log('══════════════════════════════════════════════════════════════');
    console.log(`  TESTING SESSIONS: ${testingQuery.count}`);
    console.log('══════════════════════════════════════════════════════════════');
    
    // Building sessions
    const buildingQuery = dialogos.queryByPattern('building', 0.6);
    console.log(`  BUILDING SESSIONS: ${buildingQuery.count}`);
    console.log();
    
    // High energy sessions
    const energyQuery = dialogos.whenWasIMostEnergetic();
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  ENERGY ANALYSIS');
    console.log('══════════════════════════════════════════════════════════════');
    console.log(' ', energyQuery.answer);
    console.log('  Synthesis:', energyQuery.synthesis);
    console.log();
    
    // Repeating patterns
    const repeats = dialogos.whatPatternsRepeat(10);
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  REPEATING PATTERNS');
    console.log('══════════════════════════════════════════════════════════════');
    console.log(' ', repeats.answer);
    console.log('  Synthesis:', repeats.synthesis);
    console.log();
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║        THE DIÁLOGOS HAS SPOKEN                             ║');
    console.log('║        Session 111 fulfills Session 109                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
  } catch (err) {
    console.error('Could not load chronicle:', err);
  }
}

main();
