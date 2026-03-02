import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractKeywords,
  extractKeyPoints,
  calculatePriority,
  compressExchange,
  CompressionEngine,
  DEFAULT_COMPRESSION_CONFIG,
  type Message,
  type CompressionConfig,
} from './memory_compression.js';

describe('Memory Compression System', () => {
  describe('extractKeywords', () => {
    it('should extract meaningful keywords', () => {
      const text = 'The quick brown fox jumps over the lazy dog. Memory compression is important for AI systems.';
      const keywords = extractKeywords(text);
      
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.length).toBeLessThanOrEqual(10);
      expect(keywords.some(k => ['memory', 'compression', 'important', 'systems'].includes(k))).toBe(true);
    });

    it('should filter out stop words', () => {
      const text = 'the and or but is are was were be been being';
      const keywords = extractKeywords(text);
      
      expect(keywords.length).toBe(0);
    });

    it('should handle empty text', () => {
      expect(extractKeywords('')).toEqual([]);
    });

    it('should prioritize by frequency', () => {
      const text = 'memory memory memory compression';
      const keywords = extractKeywords(text);
      
      expect(keywords[0]).toBe('memory');
    });
  });

  describe('extractKeyPoints', () => {
    it('should extract code blocks', () => {
      const text = 'Code: ```typescript const x = 5; ``` more';
      const points = extractKeyPoints(text);
      
      expect(points.some(p => p.includes('const x'))).toBe(true);
    });

    it('should extract file paths', () => {
      const text = 'Check src/core/memory.ts and journal/entry.md';
      const points = extractKeyPoints(text);
      
      expect(points.some(p => p.includes('src/core/memory.ts'))).toBe(true);
    });

    it('should extract TODO markers', () => {
      const text = 'TODO: implement this';
      const points = extractKeyPoints(text);
      
      expect(points.some(p => p.includes('TODO'))).toBe(true);
    });
  });

  describe('calculatePriority', () => {
    const config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG;

    it('should give higher priority to system messages', () => {
      const systemMsg: Message = { role: 'system', content: 'System prompt' };
      const userMsg: Message = { role: 'user', content: 'User message' };
      
      const systemPriority = calculatePriority(systemMsg, 0, 2, [], config);
      const userPriority = calculatePriority(userMsg, 1, 2, [], config);
      
      expect(systemPriority.importance).toBeGreaterThan(userPriority.importance);
    });

    it('should give higher recency to later messages', () => {
      const msg: Message = { role: 'user', content: 'Test' };
      
      const earlyPriority = calculatePriority(msg, 0, 10, [], config);
      const latePriority = calculatePriority(msg, 9, 10, [], config);
      
      expect(latePriority.recency).toBeGreaterThan(earlyPriority.recency);
    });

    it('should detect goal-related content', () => {
      const goalMsg: Message = { role: 'user', content: 'Set goal to implement memory compression' };
      const regularMsg: Message = { role: 'user', content: 'Regular chat message' };
      
      const goalPriority = calculatePriority(goalMsg, 0, 2, [], config);
      const regularPriority = calculatePriority(regularMsg, 1, 2, [], config);
      
      expect(goalPriority.importance).toBeGreaterThan(regularPriority.importance);
    });

    it('should calculate composite score', () => {
      const msg: Message = { role: 'user', content: 'Test message' };
      const priority = calculatePriority(msg, 5, 10, ['memory', 'test'], config);
      
      expect(priority.composite).toBeGreaterThan(0);
      expect(priority.composite).toBeLessThanOrEqual(100);
    });
  });

  describe('compressExchange', () => {
    const config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG;

    it('should create compressed exchange', () => {
      const messages: Message[] = [
        { role: 'user', content: 'What about memory compression?' },
        { role: 'assistant', content: 'Let me explore that.' },
      ];
      
      const compressed = compressExchange(messages, 'ex_001', config);
      
      expect(compressed.id).toBe('ex_001');
      expect(compressed.tier).toBe('compressed');
      expect(compressed.summary).toBeDefined();
      expect(compressed.keywords.length).toBeGreaterThan(0);
    });

    it('should include tool mentions', () => {
      const messages: Message[] = [
        { role: 'assistant', content: 'Checking', tool_calls: [{ function: { name: 'run_shell' } }] },
      ];
      
      const compressed = compressExchange(messages, 'ex_002', config);
      
      expect(compressed.summary).toContain('run_shell');
    });
  });

  describe('CompressionEngine', () => {
    let engine: CompressionEngine;
    const config: CompressionConfig = {
      ...DEFAULT_COMPRESSION_CONFIG,
      workingMemoryTokens: 100,
    };

    beforeEach(() => {
      engine = new CompressionEngine(config);
    });

    it('should initialize', () => {
      const defaultEngine = new CompressionEngine();
      expect(defaultEngine).toBeDefined();
    });

    it('should not compress when under limit', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Short' },
      ];
      
      const result = await engine.compress(messages);
      
      expect(result.working.length).toBe(1);
      expect(result.compressed.length).toBe(0);
      expect(result.freed).toBe(0);
    });

    it('should compress when over token limit', async () => {
      const messages: Message[] = Array(50).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'Message with content here. '.repeat(5),
      }));
      
      const result = await engine.compress(messages);
      
      expect(result.working.length).toBeLessThan(messages.length);
      expect(result.compressed.length).toBeGreaterThan(0);
      expect(result.freed).toBeGreaterThan(0);
    });

    it('should keep recent messages in working memory', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'First message' },
        ...Array(30).fill(null).map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: 'Message ' + i,
        })),
        { role: 'user', content: 'Latest message' },
      ];
      
      const result = await engine.compress(messages);
      
      const hasRecent = result.working.some(m => 
        typeof m.content === 'string' && m.content.includes('Latest')
      );
      expect(hasRecent).toBe(true);
    });

    it('should keep high priority messages', async () => {
      const messages: Message[] = [
        { role: 'system', content: 'SYSTEM: Critical' },
        ...Array(40).fill(null).map((_, i) => ({
          role: 'user',
          content: 'Normal message content here'.repeat(10),
        })),
      ];
      
      const result = await engine.compress(messages);
      
      const hasSystem = result.working.some(m => m.role === 'system');
      expect(hasSystem).toBe(true);
    });

    it('should query relevant compressed memories by keyword match', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'memory compression strategy implementation' },
        ...Array(40).fill(null).map((_, i) => ({
          role: 'user',
          content: 'memory compression optimization'.repeat(10),
        })),
      ];
      
      await engine.compress(messages);
      
      const relevant = engine.queryRelevant(['memory'], 0);
      expect(relevant.length).toBeGreaterThan(0);
    });

    it('should sort results by composite score', async () => {
      const messages: Message[] = Array(50).fill(null).map((_, i) => ({
        role: 'user',
        content: 'memory compression important'.repeat(10),
      }));
      
      await engine.compress(messages);
      
      const relevant = engine.queryRelevant(['memory'], 0);
      
      for (let i = 1; i < relevant.length; i++) {
        expect(relevant[i-1].priority.composite).toBeGreaterThanOrEqual(relevant[i].priority.composite);
      }
    });

    it('should return compression stats', async () => {
      const messages: Message[] = Array(50).fill(null).map((_, i) => ({
        role: 'user',
        content: 'Message with content about memory compression'.repeat(10),
      }));
      
      await engine.compress(messages);
      
      const stats = engine.getStats();
      
      expect(stats.totalCompressed).toBeGreaterThan(0);
      expect(stats.totalOriginalTokens).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeLessThanOrEqual(1);
    });

    it('should handle empty messages', async () => {
      const result = await engine.compress([]);
      expect(result.working).toEqual([]);
      expect(result.compressed).toEqual([]);
    });

    it('should return empty array for non-matching keywords', async () => {
      const messages: Message[] = Array(50).fill(null).map((_, i) => ({
        role: 'user',
        content: 'Message with content'.repeat(10),
      }));
      
      await engine.compress(messages);
      
      const relevant = engine.queryRelevant(['nonexistent', 'foobarxyz'], 1000);
      expect(relevant.length).toBe(0);
    });
  });
});
