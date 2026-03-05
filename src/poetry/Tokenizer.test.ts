import { describe, expect, test, beforeEach } from 'vitest';
import type { Token, Line } from './Tokenizer';
import { Tokenizer } from './Tokenizer';

describe('Tokenizer', () => {
  let tokenizer: Tokenizer;
  
  beforeEach(() => {
    tokenizer = new Tokenizer();
  });
  
  test('tokenizes a simple line', () => {
    const result = tokenizer.tokenize('Hello world');
    expect(result).toHaveLength(1);
    const firstLine = result[0];
    if (!firstLine) throw new Error('Expected first line');
    expect(firstLine.tokens).toHaveLength(3);
    const firstToken = firstLine.tokens[0];
    if (!firstToken) throw new Error('Expected first token');
    expect(firstToken.type).toBe('word');
    expect(firstToken.value).toBe('Hello');
  });
  
  test('tokenizes multiple lines', () => {
    const input = 'First line\nSecond line';
    const result = tokenizer.tokenize(input);
    expect(result).toHaveLength(2);
    const line1 = result[0];
    const line2 = result[1];
    if (!line1 || !line2) throw new Error('Expected both lines');
    expect(line1.lineNumber).toBe(1);
    expect(line2.lineNumber).toBe(2);
  });
  
  test('handles empty lines', () => {
    const result = tokenizer.tokenize('Hello\n\nWorld');
    const middleLine = result[1];
    if (!middleLine) throw new Error('Expected middle line');
    expect(middleLine.isEmpty).toBe(true);
  });
  
  test('captures leading whitespace', () => {
    const result = tokenizer.tokenize('  indented');
    const firstLine = result[0];
    if (!firstLine) throw new Error('Expected first line');
    expect(firstLine.leadingWhitespace).toBe('  ');
  });
  
  test('tokenizes punctuation', () => {
    const result = tokenizer.tokenize('Hello, world!');
    const firstLine = result[0];
    if (!firstLine) throw new Error('Expected first line');
    const punctTokens = firstLine.tokens.filter((t: Token) => t.type === 'punctuation');
    expect(punctTokens).toHaveLength(2);
  });
});
