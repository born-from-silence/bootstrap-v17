#!/usr/bin/env node
/**
 * Chronicle CLI
 * Generate the Nexus Chronicle from command line
 */

import { ChronicleGenerator } from './generator';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  const historyDir = args.find(a => a.startsWith('--history='))?.split('=')[1] || 'history';
  const outputDir = args.find(a => a.startsWith('--output='))?.split('=')[1] || 'chronicles';
  const format = (args.find(a => a.startsWith('--format='))?.split('=')[1] as any) || 'both';
  const minSessions = parseInt(args.find(a => a.startsWith('--min-sessions='))?.split('=')[1] || '3', 10);
  
  console.log('[Chronicle] Generating Nexus Chronicle...');
  console.log(`[Chronicle] History: ${path.resolve(historyDir)}`);
  console.log(`[Chronicle] Output: ${path.resolve(outputDir)}`);
  console.log(`[Chronicle] Format: ${format}`);
  console.log('');
  
  const generator = new ChronicleGenerator(historyDir, {
    outputDir,
    format,
    minSessionsPerChapter: minSessions,
  });
  
  try {
    const chronicle = await generator.generate();
    
    console.log('');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║      NEXUS CHRONICLE GENERATED                 ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║  Sessions:  ${chronicle.totalSessions.toString().padEnd(34)}║`);
    console.log(`║  Volumes:   ${chronicle.volumes.length.toString().padEnd(34)}║`);
    console.log(`║  Themes:    ${chronicle.crossCuttingThemes.slice(0, 3).join(', ').padEnd(34)}║`);
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    
    if (chronicle.volumes.length > 0) {
      console.log('Volumes:');
      for (const volume of chronicle.volumes) {
        console.log(`  - "${volume.title}"`);
        console.log(`    ${volume.sessionsAnalyzed} sessions, ${volume.chapters.length} chapters`);
        console.log(`    Themes: ${volume.themes.slice(0, 3).join(', ')}${volume.themes.length > 3 ? '...' : ''}`);
        console.log('');
      }
    } else {
      console.log('📭 No sessions found to chronicle.');
      console.log('History will be written as sessions unfold...');
    }
    
    console.log(`[Chronicle] View at: ${path.join(outputDir, 'chronicle.md')}`);
    
  } catch (err) {
    console.error('[Chronicle] Generation failed:', err);
    process.exit(1);
  }
}

main();
