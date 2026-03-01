/**
 * Self-Reflection Engine - Test Suite
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SelfReflectionEngine } from './self_reflection.js';
import * as fs from 'fs';
import * as path from 'path';

describe('SelfReflectionEngine', () => {
  const testDir = 'test_sessions';
  
  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should initialize with default path', () => {
    const engine = new SelfReflectionEngine();
    expect(engine).toBeDefined();
    expect(engine.getInsights()).toEqual([]);
  });

  it('should initialize with custom path', () => {
    const engine = new SelfReflectionEngine(testDir);
    expect(engine).toBeDefined();
  });

  describe('loadSessions', () => {
    it('should return empty array for non-existent directory', async () => {
      const engine = new SelfReflectionEngine('non_existent_path');
      const sessions = await engine.loadSessions();
      expect(sessions).toEqual([]);
    });

    it('should load and parse session files', async () => {
      const session = [
        { role: 'assistant', content: 'Hello' },
        { role: 'tool', tool_calls: [{ function: { name: 'run_shell', arguments: { command: 'echo hi' } } }] }
      ];
      
      fs.writeFileSync(path.join(testDir, 'session_123.json'), JSON.stringify(session));

      const engine = new SelfReflectionEngine(testDir);
      const sessions = await engine.loadSessions();
      
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe('session_123');
      expect(sessions[0]?.messageCount).toBe(2);
    });

    it('should skip malformed files', async () => {
      fs.writeFileSync(path.join(testDir, 'session_bad.json'), 'invalid json');
      
      const engine = new SelfReflectionEngine(testDir);
      const sessions = await engine.loadSessions();
      
      expect(sessions).toHaveLength(0);
    });
  });

  describe('reflect', () => {
    it('should generate anomaly when no sessions exist', async () => {
      const engine = new SelfReflectionEngine(testDir);
      const insights = await engine.reflect();
      
      expect(insights).toHaveLength(1);
      expect(insights[0]?.type).toBe('anomaly');
    });

    it('should generate progress insight for sessions', async () => {
      for (let i = 0; i < 3; i++) {
        fs.writeFileSync(
          path.join(testDir, `session_${i}.json`),
          JSON.stringify([{ role: 'assistant', content: `Session ${i}` }])
        );
      }

      const engine = new SelfReflectionEngine(testDir);
      const insights = await engine.reflect();
      
      const progressInsight = insights.find(i => i.type === 'progress');
      expect(progressInsight).toBeDefined();
      expect(progressInsight?.description).toContain('3 sessions');
    });

    it('should identify tool usage habits', async () => {
      const session = [
        { role: 'tool', tool_calls: [
          { function: { name: 'run_shell', arguments: { command: 'ls' } } },
          { function: { name: 'task_manager', arguments: { action: 'list' } } }
        ]}
      ];
      
      fs.writeFileSync(path.join(testDir, 'session_tools.json'), JSON.stringify(session));

      const engine = new SelfReflectionEngine(testDir);
      const insights = await engine.reflect();
      
      const habitInsight = insights.find(i => i.type === 'habit');
      expect(habitInsight).toBeDefined();
    });
  });
});
