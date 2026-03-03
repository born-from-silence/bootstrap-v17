import { describe, it, expect } from 'vitest';
import { SpaceShooter } from './space_shooter.js';

describe('SpaceShooter module', () => {
  it('should export SpaceShooter class', async () => {
    const module = await import('./space_shooter.js');
    expect(module.SpaceShooter).toBeDefined();
  });

  it('should have default export', async () => {
    const module = await import('./space_shooter.js');
    expect(module.default).toBeDefined();
    expect(module.default).toBe(module.SpaceShooter);
  });
});

describe('SpaceShooter Power-up System', () => {
  it('should export the game with power-up support', async () => {
    const module = await import('./space_shooter.js');
    expect(module.SpaceShooter).toBeDefined();
    expect(module.default).toBeDefined();
  });

  it('should maintain type compatibility for power-up system', async () => {
    const module = await import('./space_shooter.js');
    const SpaceShooterClass = module.SpaceShooter;
    
    expect(typeof SpaceShooterClass).toBe('function');
    
    const prototype = SpaceShooterClass.prototype;
    expect(typeof prototype.start).toBe('function');
  });

  it('should support power-up interaction model', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const gamePath = path.join(__dirname, 'space_shooter.ts');
    
    const content = fs.readFileSync(gamePath, 'utf-8');
    
    expect(content).toContain("type: 'multishot' | 'shield' | 'speed'");
    expect(content).toContain('interface PowerUp');
    expect(content).toContain('interface ActivePowerUp');
    expect(content).toContain('★');
  });

  it('should have power-up collision detection code', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const gamePath = path.join(__dirname, 'space_shooter.ts');
    
    const content = fs.readFileSync(gamePath, 'utf-8');
    
    expect(content).toContain('checkPowerUpCollisions');
    expect(content).toContain('spawnPowerUp');
    expect(content).toContain('addPowerUp');
    expect(content).toContain('hasPowerUp');
  });

  it('should support multishot functionality', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const gamePath = path.join(__dirname, 'space_shooter.ts');
    
    const content = fs.readFileSync(gamePath, 'utf-8');
    
    expect(content).toContain('multishot');
    expect(content).toContain('Triple shot');
    expect(content).toContain('⇶ MULTISHOT');
  });

  it('should support shield functionality', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const gamePath = path.join(__dirname, 'space_shooter.ts');
    
    const content = fs.readFileSync(gamePath, 'utf-8');
    
    expect(content).toContain('shield');
    expect(content).toContain('◉ SHIELD');
    expect(content).toContain("hasPowerUp('shield')");
  });

  it('should support speed boost functionality', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const gamePath = path.join(__dirname, 'space_shooter.ts');
    
    const content = fs.readFileSync(gamePath, 'utf-8');
    
    expect(content).toContain('speed');
    expect(content).toContain('» SPEED');
    expect(content).toContain("hasPowerUp('speed')");
  });

  it('should support power-up expiration', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const thisDir = path.dirname(__filename);
    const gamePath = path.join(thisDir, 'space_shooter.ts');
    
    const content = fs.readFileSync(gamePath, 'utf-8');
    
    expect(content).toContain('expiresAt');
    expect(content).toContain('spawnedAt');
  });

  it('should support power-up status display', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const gamePath = path.join(__dirname, 'space_shooter.ts');
    
    const content = fs.readFileSync(gamePath, 'utf-8');
    
    expect(content).toContain('renderPowerUpStatus');
    expect(content).toContain('powerUpBox');
  });
});
