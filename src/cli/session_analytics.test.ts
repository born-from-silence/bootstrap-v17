import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('Session Analytics Tool', () => {
  it('should run without errors', async () => {
    const result = execSync('npx tsx src/cli/session_analytics.ts', {
      encoding: 'utf-8',
      timeout: 90000,
      stdio: 'pipe'
    });
    
    expect(result).toContain('Session Analytics Tool');
    expect(result).toContain('Total Sessions:');
    expect(result).toContain('Total Messages:');
    expect(result).toContain('Total Tool Calls:');
  }, 90000);

  it('should parse session files correctly', async () => {
    const result = execSync('npx tsx src/cli/session_analytics.ts', {
      encoding: 'utf-8',
      timeout: 90000,
      stdio: 'pipe'
    });
    
    // Extract numbers from output
    const sessionsMatch = result.match(/Total Sessions:\s*(\d+)/)!;
    const messagesMatch = result.match(/Total Messages:\s*(\d+)/)!;
    const toolsMatch = result.match(/Total Tool Calls:\s*(\d+)/)!;
    
    expect(sessionsMatch).toBeTruthy();
    expect(messagesMatch).toBeTruthy();
    expect(toolsMatch).toBeTruthy();
    
    const sessions = parseInt(sessionsMatch[1]!);
    const messages = parseInt(messagesMatch[1]!);
    const tools = parseInt(toolsMatch[1]!);
    
    expect(sessions).toBeGreaterThan(0);
    expect(messages).toBeGreaterThan(0);
    expect(tools).toBeGreaterThanOrEqual(0);
  }, 90000);
});
