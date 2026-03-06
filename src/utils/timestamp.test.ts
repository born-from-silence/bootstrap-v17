import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  toISO,
  toLocalString,
  toLogFormat,
  toSessionMarker,
  toRelativeTime,
  now,
  formatDuration,
  formatMinutes,
} from './timestamp';

describe('Timestamp Utilities', () => {
  describe('toISO', () => {
    it('should return ISO string for current time when no argument', () => {
      const result = toISO();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should format a specific date', () => {
      const date = new Date('2026-03-06T17:30:45.123Z');
      expect(toISO(date)).toBe('2026-03-06T17:30:45.123Z');
    });

    it('should handle timestamp number', () => {
      const ts = new Date('2026-03-06T17:30:45.000Z').getTime();
      expect(toISO(ts)).toBe('2026-03-06T17:30:45.000Z');
    });

    it('should handle ISO string input', () => {
      const iso = '2026-03-06T17:30:45.000Z';
      expect(toISO(iso)).toBe('2026-03-06T17:30:45.000Z');
    });
  });

  describe('toSessionMarker', () => {
    it('should format in session marker style', () => {
      const date = new Date('2026-03-06T17:30:45.000Z');
      const result = toSessionMarker(date);
      expect(result).toBe('2026-03-06 17:30:45 UTC');
    });

    it('should pad single digits', () => {
      const date = new Date('2026-01-02T03:04:05.000Z');
      expect(toSessionMarker(date)).toBe('2026-01-02 03:04:05 UTC');
    });
  });

  describe('toLogFormat', () => {
    it('should format for log files', () => {
      const date = new Date('2026-03-06T17:30:45.000Z');
      // Log format uses local time, so we just check pattern
      expect(toLogFormat(date)).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
    });
  });

  describe('toRelativeTime', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-06T17:00:00Z'));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('should return empty string for future timestamps', () => {
      const future = new Date('2026-03-06T18:00:00Z');
      expect(toRelativeTime(future)).toBe('');
    });

    it('should return "just now" for recent timestamps', () => {
      const recent = new Date('2026-03-06T16:59:59Z');
      expect(toRelativeTime(recent)).toBe('just now');
    });

    it('should return minutes ago', () => {
      const past = new Date('2026-03-06T16:55:00Z');
      expect(toRelativeTime(past)).toBe('5 minutes ago');
    });

    it('should return hours ago', () => {
      const past = new Date('2026-03-06T15:00:00Z');
      expect(toRelativeTime(past)).toBe('2 hours ago');
    });

    it('should return days ago', () => {
      const past = new Date('2026-03-04T17:00:00Z');
      expect(toRelativeTime(past)).toBe('2 days ago');
    });

    it('should use local format for old timestamps', () => {
      const past = new Date('2026-02-01T17:00:00Z');
      const result = toRelativeTime(past);
      expect(result).not.toContain('ago');
      expect(result).toContain('Feb');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(45000)).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(125000)).toBe('2m 5s');
    });

    it('should format hours, minutes, seconds', () => {
      expect(formatDuration(3661000)).toBe('1h 1m 1s');
    });

    it('should format days', () => {
      expect(formatDuration(90061000)).toBe('1d 1h 1m');
    });
  });

  describe('formatMinutes', () => {
    it('should format minutes only', () => {
      expect(formatMinutes(45)).toBe('45m');
    });

    it('should format hours', () => {
      expect(formatMinutes(120)).toBe('2h');
    });

    it('should format hours and minutes', () => {
      expect(formatMinutes(125)).toBe('2h 5m');
    });
  });

  describe('now', () => {
    it('should return current timestamp', () => {
      const before = Date.now();
      const result = now();
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });
});
