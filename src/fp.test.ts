/**
 * File Processor Tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { detectFileContent, analyzeProject } from './fp.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const TEST_DIR = '/tmp/fp-test-' + Date.now();

describe('File Processor', () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    
    // Create test files
    await writeFile(join(TEST_DIR, 'utf8.txt'), 'Hello World!\nThis is UTF-8 text.\n');
    await writeFile(join(TEST_DIR, 'utf16.txt'), Buffer.from('\ufeffHello World!', 'utf16le'));
    await writeFile(join(TEST_DIR, 'binary.bin'), Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]));
    await writeFile(join(TEST_DIR, 'empty.txt'), '');
    await writeFile(join(TEST_DIR, 'spaces.txt'), '    lots   of   spaces   here   ');
    await writeFile(join(TEST_DIR, 'csv.csv'), 'name,value\nAlice,100\nBob,200\n');
    await writeFile(join(TEST_DIR, 'code.ts'), 'const x = "hello";\nconsole.log(x);');
  });
  
  afterAll(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('detectFileContent', () => {
    it('should detect UTF-8 text files', async () => {
      const result = await detectFileContent(join(TEST_DIR, 'utf8.txt'));
      expect(result).toBe('utf-8');
    });
    
    it('should detect UTF-16 files by BOM', async () => {
      const result = await detectFileContent(join(TEST_DIR, 'utf16.txt'));
      expect(result).toBe('utf-16');
    });
    
    it('should detect binary files', async () => {
      const result = await detectFileContent(join(TEST_DIR, 'binary.bin'));
      expect(result).toBe('binary');
    });
    
    it('should detect empty files', async () => {
      const result = await detectFileContent(join(TEST_DIR, 'empty.txt'));
      expect(result).toBe('empty');
    });
    
    it('should detect CSV files as UTF-8', async () => {
      const result = await detectFileContent(join(TEST_DIR, 'csv.csv'));
      expect(result).toBe('utf-8');
    });
    
    it('should detect TypeScript files as UTF-8', async () => {
      const result = await detectFileContent(join(TEST_DIR, 'code.ts'));
      expect(result).toBe('utf-8');
    });
  });
  
  describe('analyzeProject', () => {
    it('should analyze a directory and count files', async () => {
      const analysis = await analyzeProject(TEST_DIR);
      
      // 7 files: utf8.txt, utf16.txt, binary.bin, empty.txt, spaces.txt, csv.csv, code.ts
      expect(analysis.totalFiles).toBe(7);
      expect(analysis.textFiles).toBeGreaterThan(0);
      expect(analysis.binaryFiles).toBe(1);
      expect(analysis.extensions.get('.txt')).toBe(4); // utf8.txt, empty.txt, spaces.txt, plus maybe one more
    });
    
    it('should track extensions correctly', async () => {
      const analysis = await analyzeProject(TEST_DIR);
      expect(analysis.extensions.has('.txt')).toBe(true);
      expect(analysis.extensions.has('.csv')).toBe(true);
      expect(analysis.extensions.has('.ts')).toBe(true);
      expect(analysis.extensions.has('.bin')).toBe(true);
    });
  });
});
