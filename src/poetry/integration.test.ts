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
    expect(structure.stanzas[0].lineCount).toBe(2);
    expect(structure.stanzas[1].lineCount).toBe(1);
  });
  
  test('distinguishes short lines from long lines', () => {
    const tokenizer = new Tokenizer();
    const parser = new StanzaParser();
    
    // Short poem-like lines
    const shortLines = tokenizer.tokenize(`Sun
Off
Glasses
Bright`);
    const shortResult = parser.detectMeter(shortLines);
    
    // Long prose-like line
    const longLines = tokenizer.tokenize(`When the sun removes its protective eyewear we must consider the implications for solar radiation management`);
    const longResult = parser.detectMeter(longLines);
    
    // Short lines should suggest verse (fewer syllables per line)
    // Long lines should suggest prose
    expect(shortResult).not.toBe('likely-prose');
    expect(longResult).toBe('likely-prose');
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
