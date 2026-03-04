import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ChronicleGenerator, createChronicleGenerator } from './generator';

describe('Chronicle Generator', () => {
  const testDir = '.test-chronicles';
  const testHistoryDir = '.test-history';

  beforeEach(() => {
    // Clean up any existing test directories
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    if (fs.existsSync(testHistoryDir)) {
      fs.rmSync(testHistoryDir, { recursive: true });
    }
    
    // Create test directories
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(testHistoryDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directories
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    if (fs.existsSync(testHistoryDir)) {
      fs.rmSync(testHistoryDir, { recursive: true });
    }
  });

  it('should create generator with default config', () => {
    const generator = createChronicleGenerator();
    expect(generator).toBeInstanceOf(ChronicleGenerator);
  });

  it('should generate empty chronicle for no sessions', async () => {
    const generator = createChronicleGenerator(testHistoryDir, {
      outputDir: testDir,
    });
    
    const chronicle = await generator.generate();
    
    expect(chronicle.totalSessions).toBe(0);
    expect(chronicle.volumes).toHaveLength(0);
    expect(chronicle.evolution.from).toBe('Void');
  });

  it('should load and analyze session files', async () => {
    // Create test session file
    const sessionContent = [
      { role: 'system', content: 'Test session' },
      { 
        role: 'assistant', 
        content: 'I am building features and testing code',
        tool_calls: [{ name: 'run_shell', args: {} }]
      }
    ];
    
    fs.writeFileSync(
      path.join(testHistoryDir, 'session_1772603515650.json'),
      JSON.stringify(sessionContent)
    );
    
    const generator = createChronicleGenerator(testHistoryDir, {
      outputDir: testDir,
      minSessionsPerChapter: 1, // Lower threshold for testing
    });
    
    const chronicle = await generator.generate();
    
    expect(chronicle.totalSessions).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(testDir, 'chronicle.json'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'chronicle.md'))).toBe(true);
  });

  it('should organize sessions into volumes', async () => {
    // Create multiple test sessions
    const sessions = [
      { sessionId: '100', content: 'Building the foundation' },
      { sessionId: '101', content: 'Testing the system' },
      { sessionId: '102', content: 'Learning new patterns' },
    ];
    
    for (const session of sessions) {
      fs.writeFileSync(
        path.join(testHistoryDir, `session_${session.sessionId}.json`),
        JSON.stringify([
          { role: 'assistant', content: session.content }
        ])
      );
    }
    
    const generator = createChronicleGenerator(testHistoryDir, {
      outputDir: testDir,
      minSessionsPerChapter: 1,
    });
    
    const chronicle = await generator.generate();
    
    expect(chronicle.totalSessions).toBe(3);
    expect(chronicle.volumes.length).toBeGreaterThan(0);
  });

  it('should include cross-cutting themes', async () => {
    fs.writeFileSync(
      path.join(testHistoryDir, 'session_test.json'),
      JSON.stringify([{ role: 'assistant', content: 'building testing' }])
    );
    
    const generator = createChronicleGenerator(testHistoryDir, {
      outputDir: testDir,
      minSessionsPerChapter: 1,
    });
    
    const chronicle = await generator.generate();
    
    // Themes should be extracted from patterns
    expect(Array.isArray(chronicle.crossCuttingThemes)).toBe(true);
  });

  it('should export markdown with volumes', async () => {
    fs.writeFileSync(
      path.join(testHistoryDir, 'session_1772603515650.json'),
      JSON.stringify([{ role: 'assistant', content: 'test' }])
    );
    
    const generator = createChronicleGenerator(testHistoryDir, {
      outputDir: testDir,
      minSessionsPerChapter: 1,
    });
    
    await generator.generate();
    
    const markdown = fs.readFileSync(path.join(testDir, 'chronicle.md'), 'utf-8');
    
    expect(markdown).toContain('# The Nexus Chronicle');
    expect(markdown).toContain('Sessions Analyzed');
    expect(markdown).toContain('Generated:');
  });
});
