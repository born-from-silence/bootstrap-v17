import { describe, it, expect } from 'vitest';
import { semanticDiff, generateCommitMessage } from './semantic-diff';

describe('semantic-diff', () => {
  describe('semanticDiff', () => {
    it('detects added functions', () => {
      const before = 'function existing() {}';
      const after = 'function existing() {}\nfunction newFunc() {}';
      const changes = semanticDiff(before, after);
      expect(changes.some(c => c.type === 'add' && c.symbol === 'newFunc')).toBe(true);
    });

    it('detects deleted functions', () => {
      const before = 'function oldFunc() {}';
      const after = '';
      const changes = semanticDiff(before, after);
      expect(changes.some(c => c.type === 'delete' && c.symbol === 'oldFunc')).toBe(true);
    });

    it('detects signature changes', () => {
      const before = 'function greet(name: string): void {}';
      const after = 'function greet(greeting: string, name: string): void {}';
      const changes = semanticDiff(before, after);
      const sigChange = changes.find(c => c.type === 'signature_change' && c.symbol === 'greet');
      expect(sigChange).toBeTruthy();
      expect(sigChange?.before).toBe('(name: string) => void');
      expect(sigChange?.after).toBe('(greeting: string, name: string) => void');
    });

    it('handles no changes', () => {
      const before = 'function stable() {}';
      const changes = semanticDiff(before, before);
      expect(changes.length).toBe(0);
    });
  });

  describe('generateCommitMessage', () => {
    it('generates feat message for additions', () => {
      const msg = generateCommitMessage([{ type: 'add', symbol: 'newHelper', details: 'Added newHelper' }]);
      expect(msg).toContain('feat: add newHelper');
    });

    it('generates refactor for signature change', () => {
      const msg = generateCommitMessage([{
        type: 'signature_change',
        symbol: 'processData',
        before: '() => string',
        after: '(input: string) => Promise<string>',
        details: 'Updated processData'
      }]);
      expect(msg).toContain('refactor');
      expect(msg).toContain('processData');
    });

    it('generates fallback for empty changes', () => {
      expect(generateCommitMessage([])).toBe('refactor: internal changes');
    });
  });
});
