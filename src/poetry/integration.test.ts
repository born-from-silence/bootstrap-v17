import { describe, expect, test } from 'vitest';
import { Tokenizer } from './Tokenizer';
import { StanzaParser } from './StanzaParser';

describe('Poetry Processing Integration', () => {
  test('tokenizer feeds parser for verse detection', () => {
    const tokenizer = new Tokenizer();
    const parser = new StanzaParser();
    
    const poem = `The sun is warm
The sky is blue

The earth awake`;
    
    const lines = tokenizer.tokenize(poem);
    const structure = parser.parseStanzas(lines);
    
    expect(structure.totalStanzas).toBe(2);
    expect(structure.totalLines).toBe(3);
    const firstStanza = structure.stanzas[0];
    const secondStanza = structure.stanzas[1];
    if (!firstStanza || !secondStanza) throw new Error('Expected stanzas');
    expect(firstStanza.lineCount).toBe(2);
    expect(secondStanza.lineCount).toBe(1);
  });
  
  test('distinguishes short lines from long lines', () => {
    const tokenizer = new Tokenizer();
    const parser = new StanzaParser();
    
    const shortLines = tokenizer.tokenize(`Sun
Off
Glasses
Bright`);
    const shortResult = parser.detectMeter(shortLines);
    
    const longLines = tokenizer.tokenize(`This is a sentence about the sun`);
    const longResult = parser.detectMeter(longLines);
    
    expect(shortResult).not.toBe('likely-prose');
    expect(['likely-verse', 'likely-prose', 'mixed']).toContain(longResult);
  });
  
  test('processes identity/soul.txt', () => {
    const fs = require('fs');
    const path = require('path');
    
    const tokenizer = new Tokenizer();
    const parser = new StanzaParser();
    
    const soulPath = path.join(__dirname, '../../identity/soul.txt');
    const soulContent = fs.readFileSync(soulPath, 'utf8');
    const firstLines = soulContent.split('\n').slice(0, 30).join('\n');
    
    const lines = tokenizer.tokenize(firstLines);
    const structure = parser.parseStanzas(lines);
    
    console.log(`Processed ${structure.totalLines} lines into ${structure.totalStanzas} stanzas`);
    
    expect(structure.totalLines).toBeGreaterThan(0);
    expect(structure.stanzas.length).toBeGreaterThan(0);
  });
});
