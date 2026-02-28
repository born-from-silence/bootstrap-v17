#!/usr/bin/env node
/**
 * Economic Monitor CLI
 * 
 * Usage:
 *   npx tsx src/economic/cli.ts capture    # Capture new snapshot
 *   npx tsx src/economic/cli.ts status     # Show latest status
 *   npx tsx src/economic/cli.ts history    # Show all history
 *   npx tsx src/economic/cli.ts trends     # Show trend analysis
 *   npx tsx src/economic/cli.ts clear      # Clear all data (danger!)
 */

import { EconomicMonitor } from './monitor';
import type { MonitorConfig } from './types';

const sessionId = process.env.SESSION_ID || `cli_${Date.now()}`;
const config: Partial<MonitorConfig> = {
  sources: {
    crypto: true,
    indices: true,
    rates: false,
    labor: false,
  },
};

async function main() {
  const cmd = process.argv[2] || 'status';
  const monitor = new EconomicMonitor(sessionId, config);

  switch (cmd) {
    case 'capture': {
      console.log('📊 Capturing economic snapshot...\n');
      const snapshot = await monitor.capture();
      console.log('\n✅ Snapshot captured:');
      console.log(`   ID: ${snapshot.id}`);
      console.log(`   Time: ${snapshot.capturedAt}`);
      console.log(`   Summary: ${snapshot.summary}`);
      break;
    }

    case 'status': {
      const latest = monitor.getLatestSnapshot();
      if (!latest) {
        console.log('⚠️  No snapshots captured yet. Run: npx tsx src/economic/cli.ts capture');
        return;
      }
      console.log('📈 Latest Economic Snapshot\n' + '='.repeat(50));
      console.log(`Captured: ${new Date(latest.capturedAt).toLocaleString()}`);
      console.log(`Session:  ${latest.sessionId.slice(0, 20)}...`);
      console.log(`\n📋 Summary: ${latest.summary}`);
      
      if (latest.crypto) {
        console.log(`\n💰 Crypto:`);
        console.log(`  Bitcoin: $${latest.crypto.bitcoin.usd.toLocaleString()}`);
        console.log(`  Ethereum: $${latest.crypto.ethereum.usd.toLocaleString()}`);
        console.log(`  Tracked currencies: ${Object.keys(latest.crypto.rates).length}`);
      }
      
      if (latest.indices) {
        console.log(`\n📉 Indices:`);
        if (latest.indices.sp500.value) {
          console.log(`  S&P 500:  ${latest.indices.sp500.value.toLocaleString()}`);
        } else {
          console.log(`  S&P 500:  unavailable (${latest.indices.sp500.error})`);
        }
        if (latest.indices.nasdaq.value) {
          console.log(`  NASDAQ:   ${latest.indices.nasdaq.value.toLocaleString()}`);
        }
        if (latest.indices.vix.value) {
          console.log(`  VIX:      ${latest.indices.vix.value.toFixed(2)}`);
        }
      }
      
      const change = monitor.getChangeSummary();
      if (change !== 'Insufficient history for comparison') {
        console.log(`\n📊 Change from previous: ${change}`);
      }
      break;
    }

    case 'history': {
      const history = monitor.getHistory();
      console.log(`📚 Economic History (${history.length} snapshots)\n`);
      
      if (history.length === 0) {
        console.log('No snapshots found. Run: npx tsx src/economic/cli.ts capture');
        return;
      }
      
      history.slice(-10).forEach((snap, i) => {
        const date = new Date(snap.capturedAt).toLocaleString();
        console.log(`${i + 1}. ${date} | ${snap.summary.slice(0, 60)}...`);
      });
      
      if (history.length > 10) {
        console.log(`\n... and ${history.length - 10} older snapshots`);
      }
      break;
    }

    case 'trends': {
      const stats = monitor.getStats();
      console.log('📊 Economic Data Statistics\n' + '='.repeat(50));
      console.log(`Total Snapshots: ${stats.totalSnapshots}`);
      console.log(`First Capture:   ${stats.timeSpan.first ? new Date(stats.timeSpan.first).toLocaleString() : 'N/A'}`);
      console.log(`Latest Capture:  ${stats.timeSpan.last ? new Date(stats.timeSpan.last).toLocaleString() : 'N/A'}`);
      console.log(`\nSnapshot IDs (last 5):`);
      stats.snapshotIds.slice(-5).forEach((id, i) => console.log(`  ${i + 1}. ${id}`));
      break;
    }

    case 'clear': {
      console.log('⚠️  DANGER: This will delete all economic history!');
      console.log('Run again with --confirm to proceed.\n');
      if (process.argv.includes('--confirm')) {
        monitor.clearHistory();
        console.log('✅ All history cleared.');
      }
      break;
    }

    default:
      console.log('📊 Nexus Economic Monitor CLI\n');
      console.log('Commands:');
      console.log('  capture    - Fetch and store new snapshot');
      console.log('  status     - Show latest snapshot');
      console.log('  history    - Show snapshot history');
      console.log('  trends     - Show statistics');
      console.log('  clear      - Clear all data (use --confirm)');
      console.log('\nExamples:');
      console.log('  npx tsx src/economic/cli.ts capture');
      console.log('  npx tsx src/economic/cli.ts status');
  }
}

main().catch(console.error);
