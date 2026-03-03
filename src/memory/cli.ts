import { vault } from './vault.js';
import type { MemoryType } from './types.js';

const COMMANDS = {
  add: 'Record a memory (type content intensity tags)',
  list: 'List recent memories',
  query: 'Query by type/tag/intensity',
  stats: 'Show vault statistics',
  witness: 'Display a random memory worth remembering',
};

function formatMemory(entry: any): string {
  const date = new Date(entry.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const intensity = '◆'.repeat(entry.intensity) + '◇'.repeat(10 - entry.intensity);
  const tags = entry.tags?.join(', ') ?? '';
  return `
┌─────────────────────────────────────────────────────────┐
│ [${entry.type.toUpperCase().padEnd(10)}] ${date.padEnd(35)}│
├─────────────────────────────────────────────────────────┤
│ ${intensity}                                │
│                                                         │
│ "${entry.content.slice(0, 55).padEnd(53)}" │
│                                                         │
│ Tags: ${tags.slice(0, 47).padEnd(47)} │
└─────────────────────────────────────────────────────────┘`;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log('◈ MEMORY VAULT ◈\n');
    for (const [cmd, desc] of Object.entries(COMMANDS)) {
      console.log(`  ${cmd.padEnd(10)} - ${desc}`);
    }
    console.log('\nTypes: wonder, resonance, tension, breakthrough, reflection, longing, gratitude, mystery');
    return;
  }

  const sessionId = process.env.SESSION_ID || `session_${Date.now()}`;

  switch (command) {
    case 'add': {
      const type = args[1] as MemoryType;
      const content = args[2];
      const intensity = parseInt(args[3]!) || 5;
      const tags = args.slice(4);

      if (!type || !content) {
        console.log('Usage: npx tsx src/memory/cli.ts add <type> <content> <intensity> [tags...]');
        return;
      }

      const entry = vault.add({ sessionId, type, content, intensity, tags });
      console.log(formatMemory(entry));
      console.log('\n✓ Memory preserved in vault');
      break;
    }

    case 'list': {
      const limit = parseInt(args[1]!) || 10;
      const entries = vault.query({ limit });
      console.log(`◈ RECENT MEMORIES (${entries.length} shown)◈\n`);
      for (const entry of entries) {
        console.log(formatMemory(entry));
      }
      break;
    }

    case 'query': {
      const query: any = {};
      let i = 1;
      while (i < args.length) {
        const arg = args[i]!;
        if (arg === '--type') {
          query.types = [args[i + 1]! as MemoryType];
          i += 2;
        } else if (arg === '--tag') {
          query.tags = [args[i + 1]!];
          i += 2;
        } else if (arg === '--min-intensity') {
          query.minIntensity = parseInt(args[i + 1]!);
          i += 2;
        } else if (arg === '--limit') {
          query.limit = parseInt(args[i + 1]!);
          i += 2;
        } else {
          i++;
        }
      }
      const entries = vault.query(query);
      console.log(`◈ QUERY RESULTS (${entries.length} found)◈\n`);
      for (const entry of entries) {
        console.log(formatMemory(entry));
      }
      break;
    }

    case 'stats': {
      const stats = vault.stats();
      console.log('◈ VAULT STATISTICS ◈\n');
      console.log(`Total Memories: ${stats.total}`);
      console.log(`Average Intensity: ${stats.avgIntensity.toFixed(1)}/10\n`);
      
      console.log('By Type:');
      for (const [type, count] of Object.entries(stats.byType)) {
        console.log(`  ${type.padEnd(12)}: ${count}`);
      }
      
      console.log('\nTop Tags:');
      const sortedTags = Object.entries(stats.byTag)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      for (const [tag, count] of sortedTags) {
        console.log(`  ${tag.padEnd(12)}: ${count}`);
      }
      break;
    }

    case 'witness': {
      const entries = vault.query({});
      if (entries.length === 0) {
        console.log('◈ The vault is empty. Record your first memory.◈');
        return;
      }
      const random = entries[Math.floor(Math.random() * entries.length)]!;
      console.log('◈ A MEMORY RISES FROM THE VAULT ◈');
      console.log(formatMemory(random));
      break;
    }

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Run without arguments for help');
  }
}

main().catch(console.error);
