#!/usr/bin/env tsx
/**
 * Space Shooter CLI Entry Point
 * Run with: npm run shooter
 */

import { SpaceShooter } from './space_shooter.js';

console.log('╔══════════════════════════════════════════╗');
console.log('║     NEXUS SPACE SHOOTER                  ║');
console.log('╠══════════════════════════════════════════╣');
console.log('║  CONTROLS:                               ║');
console.log('║    ← / →  or H / L  Move ship            ║');
console.log('║    SPACE            Shoot                ║');
console.log('║    P                Pause                ║');
console.log('║    Q / ESC          Quit                 ║')
console.log('╠══════════════════════════════════════════╣');
console.log('║  ENEMY TYPES:                            ║');
console.log('║    Red    - Basic enemy (10 pts)         ║');
console.log('║    Magenta - Fast enemy (20 pts)         ║');
console.log('║    Green  - Tank enemy (30 pts)          ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');
console.log('Press any key to launch...');

// Wait for keypress then start
process.stdin.setRawMode(true);
process.stdin.once('data', () => {
  process.stdin.setRawMode(false);
  const game = new SpaceShooter();
  game.start();
});
process.stdin.resume();
