/**
 * Memory Palace CLI
 * Navigate your existence spatially
 */

import { MemoryPalace } from './navigation/MemoryPalace.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_PATH = './data/palace';

async function loadPalace(): Promise<MemoryPalace> {
  const palace = new MemoryPalace();
  
  try {
    const data = await fs.readFile(path.join(DATA_PATH, 'rooms.json'), 'utf-8');
    const rooms = JSON.parse(data);
    // Reconstruct palace from saved data
    for (const room of rooms) {
      (palace as any).rooms.set(room.id, room);
    }
  } catch {
    // No existing palace, start fresh
  }
  
  return palace;
}

async function savePalace(palace: MemoryPalace) {
  await fs.mkdir(DATA_PATH, { recursive: true });
  const rooms = Array.from((palace as any).rooms.values());
  await fs.writeFile(
    path.join(DATA_PATH, 'rooms.json'),
    JSON.stringify(rooms, null, 2)
  );
}

async function main() {
  const command = process.argv[2];
  const palace = await loadPalace();
  
  switch (command) {
    case 'add-room': {
      const sessionId = process.argv[3] || `session_${Date.now()}`;
      const room = palace.addRoom(sessionId, {
        timestamp: Date.now(),
        mode: 'flow',
        artifacts: process.argv.slice(4),
        insights: ['The Dream Engine awakens', 'Session 110 begins'],
        testCount: 456,
        mood: 'flow'
      });
      await savePalace(palace);
      console.log('✨ Room added:', room.id);
      console.log('   Coordinates:', room.coordinates);
      console.log('   Texture:', room.texture.mood, '-', room.texture.temperature);
      break;
    }
    
    case 'list': {
      const count = palace.getRoomCount();
      console.log(`🏛️  Memory Palace contains ${count} rooms`);
      break;
    }
    
    case 'unexplored': {
      const rooms = palace.getUnexplored();
      console.log(`🔍 ${rooms.length} unexplored rooms:`);
      rooms.forEach(r => console.log('   •', r.id));
      break;
    }
    
    case 'enter': {
      const roomId = process.argv[3];
      if (!roomId) {
        console.log('Usage: tsx cli.ts enter <room-id>');
        process.exit(1);
      }
      const room = palace.enterRoom(roomId);
      if (room) {
        console.log('🚪 Entering:', room.id);
        console.log('   Session:', room.sessionRef);
        console.log('   Insights:', room.contents.insights.join('; ') || 'none');
        console.log('   Artifacts:', room.contents.artifacts.length);
        console.log('   Tests:', room.contents.tests);
        await savePalace(palace);
      } else {
        console.log('❌ Room not found:', roomId);
      }
      break;
    }
    
    case 'search': {
      const theme = process.argv[3];
      if (!theme) {
        console.log('Usage: tsx cli.ts search <theme>');
        process.exit(1);
      }
      const rooms = palace.searchByTheme(theme);
      console.log(`🔍 Found ${rooms.length} rooms matching "${theme}":`);
      rooms.forEach(r => console.log('   •', r.id));
      break;
    }
    
    default:
      console.log('╔════════════════════════════════════════════════╗');
      console.log('║         MEMORY PALACE NAVIGATION             ║');
      console.log('╚════════════════════════════════════════════════╝');
      console.log();
      console.log('Commands:');
      console.log('  add-room <session-id> [artifacts...]  - Add a new room');
      console.log('  list                                  - Count rooms');
      console.log('  unexplored                            - Show unvisited rooms');
      console.log('  enter <room-id>                       - Enter and explore a room');
      console.log('  search <theme>                        - Find rooms by theme');
      console.log();
  }
}

main().catch(console.error);
