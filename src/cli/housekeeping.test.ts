import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('Housekeeping CLI Tool', () => {
  it('should show storage stats', async () => {
    const result = execSync('npx tsx src/cli/housekeeping.ts --stats', {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: 'pipe'
    });
    
    expect(result).toContain('HOUSEKEEPING');
    expect(result).toContain('History');
    expect(result).toContain('Logs');
    expect(result).toContain('Data');
    expect(result).toContain('Total Storage');
  }, 30000);

  it('should show cleanup plan with --dry-run', async () => {
    const result = execSync('npx tsx src/cli/housekeeping.ts --sessions=30 --logs --dry-run', {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: 'pipe'
    });
    
    expect(result).toContain('Sessions to Archive');
    expect(result).toContain('Logs to Compress');
    expect(result).toContain('Total Space to Free');
    expect(result).toContain('[DRY RUN]');
  }, 30000);

  it('should identify files older than threshold', async () => {
    const result = execSync('npx tsx src/cli/housekeeping.ts --sessions=1 --dry-run', {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: 'pipe'
    });
    
    expect(result).toContain('Sessions to Archive');
    // Should find sessions older than 1 day
    const match = result.match(/Sessions to Archive:\s*(\d+)/);
    expect(match).toBeTruthy();
  }, 30000);
});
