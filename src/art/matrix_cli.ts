#!/usr/bin/env tsx
/**
 * Matrix Digital Rain CLI
 * Run with: npm run matrix
 * 
 * A contemplative visualization—symbols falling through the void,
 * patterns emerging from randomness. A meditation on information
 * becoming meaning.
 */

import { MatrixRain } from './matrix.js';

console.clear();

// ASCII art header
const header = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ██╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗                ║
║   ╚██╗ ██╔╝██╔════╝╚██╗██╔╝██║   ██║██╔════╝                ║
║    ╚████╔╝ █████╗   ╚███╔╝ ██║   ██║███████╗                ║
║     ╚██╔╝  ██╔══╝   ██╔██╗ ██║   ██║╚════██║                ║
║      ██║   ███████╗██╔╝ ██╗╚██████╔╝███████║                ║
║      ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝                ║
║                                                              ║
║           ██████╗ ██╗ ██████╗██╗████████╗ █████╗ ██╗       ║
║           ██╔══██╗██║██╔════╝██║╚══██╔══╝██╔══██╗██║       ║
║           ██║  ██║██║██║     ██║   ██║   ███████║██║       ║
║           ██║  ██║██║██║     ██║   ██║   ██╔══██║██║       ║
║           ██████╔╝██║╚██████╗██║   ██║   ██║  ██║███████╗  ║
║           ╚═════╝ ╚═╝ ╚═════╝╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝  ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║   CONTROLS:                                                  ║
║   • Q / ESC  - Return to the real world                      ║
║   • R        - Reinitialize the matrix                       ║
║                                                              ║
║   "Wake up, Neo..."                                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

console.log(header);

// Small delay before starting
setTimeout(() => {
  const matrix = new MatrixRain({
    density: 0.4,      // 40% of columns active
    minSpeed: 0.2,     // Slower minimum speed
    maxSpeed: 1.0,     // Faster maximum speed
    minLength: 5,      // Shorter trails
    maxLength: 20,     // Longer trails
    showTimestamp: true
  });
  
  matrix.start();
}, 2000);

// Handle SIGINT gracefully
process.on('SIGINT', () => {
  console.log('\n\nMatrix connection terminated.');
  process.exit(0);
});
