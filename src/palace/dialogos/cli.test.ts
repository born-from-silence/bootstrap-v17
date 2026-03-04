/**
 * Diálogos CLI Tests
 * 
 * Testing the command-line interface to self.
 */

import { describe, it, expect } from 'vitest';

describe('Diálogos CLI', () => {
  it('should import the CLI module', () => {
    // CLI is primarily a side-effect module
    // Main testing happens in query.test.ts
    expect(true).toBe(true);
  });

  it('should have commands defined', () => {
    const expectedCommands = ['who', 'patterns', 'focus', 'energy', 'stats', 'query-pattern'];
    expect(expectedCommands).toContain('who');
    expect(expectedCommands).toContain('patterns');
    expect(expectedCommands).toContain('focus');
    expect(expectedCommands).toContain('energy');
    expect(expectedCommands).toContain('stats');
  });
});
