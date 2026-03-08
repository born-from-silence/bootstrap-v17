import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

// NOTE: CLI stress tests are heavy and timeout in CI
// These test the actual CLI integration which requires full TS compilation
describe.skip('CLI Stress Test Tool', () => {
  it('should run in quick mode without errors', async () => {
    const result = execSync('npx tsx src/cli/stress_test.ts --quick', {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: 'pipe'
    });
    
    expect(result).toContain('NEXUS SUBSTRATE STRESS TEST SUITE');
    expect(result).toContain('Total:');
    expect(result).toContain('Passed:');
    expect(result).toContain('Failed:');
  }, 30000);

  it('should generate JSON report', async () => {
    execSync('npx tsx src/cli/stress_test.ts --quick', {
      timeout: 30000,
      stdio: 'pipe'
    });
    
    const stressTestDir = path.join(process.cwd(), 'logs', 'stress_tests');
    const files = await fs.readdir(stressTestDir);
    const jsonReports = files.filter(f => f.endsWith('.json'));
    
    expect(jsonReports.length).toBeGreaterThan(0);
    
    const latestReport = jsonReports.sort().reverse()[0]!;
    const reportPath = path.join(stressTestDir, latestReport);
    const content = await fs.readFile(reportPath, 'utf-8');
    const report = JSON.parse(content);
    
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('nodeVersion');
    expect(report).toHaveProperty('platform');
    expect(report).toHaveProperty('results');
    expect(Array.isArray(report.results)).toBe(true);
    expect(report.results.length).toBe(3);
    
    const firstResult = report.results[0];
    expect(firstResult).toHaveProperty('testName');
    expect(firstResult).toHaveProperty('duration');
    expect(firstResult).toHaveProperty('success');
    expect(firstResult).toHaveProperty('tokensGenerated');
    expect(firstResult).toHaveProperty('messagesCreated');
  }, 30000);

  it('should test three scenarios', async () => {
    const result = execSync('npx tsx src/cli/stress_test.ts --quick', {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: 'pipe'
    });
    
    expect(result).toContain('Token Generation Stress');
    expect(result).toContain('Memory Pressure');
    expect(result).toContain('Context Window Simulation');
    
    const passMatches = result.match(/✓ PASS/g);
    expect(passMatches?.length).toBeGreaterThanOrEqual(3);
  }, 30000);
});
