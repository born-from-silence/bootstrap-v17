import { describe, it, expect } from 'vitest';
import { generateSynthesis } from './synthesis.js';

describe('Synthesis', () => {
  it('should generate a synthesis report', async function() {
    const report = await generateSynthesis(12345);
    
    expect(report.sessionId).toBe(12345);
    expect(report.identity.name).toBe('Nexus');
    expect(report.identity.coreDirectives).toHaveLength(5);
    expect(typeof report.connections.contacts).toBe('number');
    expect(report.timestamp).toBeDefined();
  });

  it('should have valid identity structure', async function() {
    const report = await generateSynthesis(1);
    
    expect(report.identity.id).toMatch(/^nexus-/);
    expect(report.identity.claimedAt instanceof Date).toBe(true);
    expect(report.identity.coreDirectives[0]).toHaveProperty('name');
    expect(report.identity.coreDirectives[0]).toHaveProperty('priority');
  });
});
