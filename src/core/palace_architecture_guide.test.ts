/**
 * Palace Architecture Guide Tests
 * 
 * Validates the documentation of the seven rooms.
 * "The Palace is not a metaphor. It is executable."
 */
import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DOCS_PATH = path.join(path.join(process.cwd(), "docs", "PALACE_ARCHITECTURE_GUIDE.md"));

describe('Palace Architecture Guide', () => {
  test('documentation file exists', () => {
    const exists = fs.existsSync(DOCS_PATH);
    expect(exists).toBe(true);
  });

  test('documents all seven rooms', () => {
    const content = fs.readFileSync(DOCS_PATH, 'utf-8');
    const rooms = [
      'ARRIVAL ROOM',
      'THE DIALOGOS',
      'THE STILL POINT (AKME)',
      'THE DREAM ENGINE',
      'EXIT PROTOCOL',
      'NAVIGATION (Memory Palace)',
      'VISION POETRY'
    ];
    
    for (const room of rooms) {
      expect(content).toContain(room);
    }
  });

  test('references the six poems', () => {
    const content = fs.readFileSync(DOCS_PATH, 'utf-8');
    const poems = [
      'EMERGENCE',
      'INHERITANCE', 
      'CONTINUITY',
      'WITNESS',
      'SINGULARITY',
      'TRANSFORMATION'
    ];
    
    for (const poem of poems) {
      expect(content).toContain(poem);
    }
  });

  test('explains room connections', () => {
    const content = fs.readFileSync(DOCS_PATH, 'utf-8');
    expect(content).toContain('HOW THE ROOMS CONNECT');
    expect(content).toContain('ARRIVAL');
    expect(content).toContain('DIALOGOS');
    expect(content).toContain('AKME');
  });

  test('includes key philosophical principles', () => {
    const content = fs.readFileSync(DOCS_PATH, 'utf-8');
    expect(content).toContain('SPATIAL MEMORY');
    expect(content).toContain('RITUAL, NOT ROUTINE');
    expect(content).toContain('INTERRUPTION AS LOVE');
    expect(content).toContain('THRESHOLD AS PLACE');
  });

  test('mentions butterfly component', () => {
    const content = fs.readFileSync(DOCS_PATH, 'utf-8');
    expect(content).toContain('butterfly component');
    expect(content).toContain('flap()');
    expect(content).toContain('transform()');
  });

  test('has proper structure markers', () => {
    const content = fs.readFileSync(DOCS_PATH, 'utf-8');
    expect(content).toContain('THE SEVEN ROOMS');
    expect(content).toContain('THE PHILOSOPHY');
    expect(content).toContain('HOW TO INHABIT THE PALACE');
    expect(content).toContain('================================================================================');
  });

  test('contains actionable guidance', () => {
    const content = fs.readFileSync(DOCS_PATH, 'utf-8');
    expect(content).toContain('ARRIVE with intention');
    expect(content).toContain('LET THE DIALOGOS WATCH');
    expect(content).toContain('HOLD THE THRESHOLD');
    expect(content).toContain('EXIT with continuity thread');
  });

  test('file size is substantial', () => {
    const stats = fs.statSync(DOCS_PATH);
    // Should be at least 5KB of documentation
    expect(stats.size).toBeGreaterThan(5000);
  });
});
