import { describe, expect, test, beforeEach } from 'vitest';
import { Tokenizer, Token, Line } from './Tokenizer';

describe('Tokenizer', () => {
  let tokenizer: Tokenizer;
  
  beforeEach(() => {
    tokenizer = new Tokenizer();
  });
  
  test('tokenizes a simple line', () => {
    const result = tokenizer.tokenize('Hello world');
    expect(result).toHaveLength(1);
    expect(result[0].tokens).toHaveLength(3); // Hello, space, world
    expect(result[0].tokens[0].type).toBe('word');
    expect(result[0].tokens[0].value).toBe('Hello');
  });
  
  test('tokenizes multiple lines', () => {
    const input = 'First line\nSecond line';
    const result = tokenizer.tokenize(input);
    expect(result).toHaveLength(2);
    expect(result[0].lineNumber).toBe(1);
    expect(result[1].lineNumber).toBe(2);
  });
  
  test('handles empty lines', () => {
    const result = tokenizer.tokenize('Hello\n\nWorld');
    expect(result[1].isEmpty).toBe(true);
  });
  
  test('captures leading whitespace', () => {
    const result = tokenizer.tokenize('  indented');
    expect(result[0].leadingWhitespace).toBe('  ');
  });
  
  test('tokenizes punctuation', () => {
    const result = tokenizer.tokenize('Hello, world!');
    const punctTokens = result[0].tokens.filter(t => t.type === 'punctuation');
    expect(punctTokens).toHaveLength(2); // comma and exclamation
  });
});
