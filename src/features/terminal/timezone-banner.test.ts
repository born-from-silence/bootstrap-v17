import { describe, it, expect } from 'vitest';
import { getDualTime, displayTimezoneBanner, getUnixTimestamp, formatDuration } from './timezone-banner';

describe('timezone-banner', () => {
  describe('getDualTime', () => {
    it('returns local, UTC, and offset', () => {
      const result = getDualTime();
      expect(result.local).toBeTruthy();
      expect(result.utc).toContain('UTC');
      expect(result.offset).toMatch(/UTC[+-]\d{1,2}:\d{2}/);
    });
  });

  describe('getUnixTimestamp', () => {
    it('returns current time in milliseconds', () => {
      const before = Date.now();
      const result = getUnixTimestamp();
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('formatDuration', () => {
    it('formats hours', () => {
      expect(formatDuration(3660000)).toContain('h');
    });

    it('formats minutes', () => {
      expect(formatDuration(90000)).toContain('m');
    });

    it('formats seconds', () => {
      expect(formatDuration(30000)).toBe('30s');
    });
  });
});
