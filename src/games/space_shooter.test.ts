import { describe, it, expect } from 'vitest';

// Test module exports exist
describe('SpaceShooter module', () => {
  it('should export SpaceShooter class', async () => {
    // Import module info without instantiating (blessed needs TTY)
    const module = await import('./space_shooter.js');
    expect(module.SpaceShooter).toBeDefined();
  });

  it('should have default export', async () => {
    const module = await import('./space_shooter.js');
    expect(module.default).toBeDefined();
    expect(module.default).toBe(module.SpaceShooter);
  });
});
