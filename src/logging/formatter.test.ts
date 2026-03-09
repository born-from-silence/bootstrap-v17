import { describe, it, expect } from "vitest";
import { formatEntry, formatStream, summarizeEntries, formatSummary, OutputFormat } from "./formatter";
import { LogEntry, LogStream } from "./types";

describe("Formatter", () => {
  const mockEntry: LogEntry = {
    timestamp: 1704067200000, // 2024-01-01 00:00:00 UTC
    category: "presence",
    level: "info",
    message: "I am here",
    source: "test",
    tone: "calm",
  };

  const mockStream: LogStream = {
    id: "test-stream",
    created: 1704067200000,
    entries: [mockEntry],
    active: true,
  };

  describe("formatEntry", () => {
    it("should format as human-readable by default", () => {
      const formatted = formatEntry(mockEntry);
      
      expect(formatted).toContain("2024");
      expect(formatted).toContain("I am here");
      expect(formatted).toContain("[calm]");
    });

    it("should format as JSON when requested", () => {
      const formatted = formatEntry(mockEntry, "json");
      const parsed = JSON.parse(formatted);
      
      expect(parsed.message).toBe("I am here");
      expect(parsed.category).toBe("presence");
    });

    it("should format compact for constrained spaces", () => {
      const formatted = formatEntry(mockEntry, "compact");
      
      expect(formatted).toContain("I am here");
      expect(formatted.length).toBeLessThan(formatEntry(mockEntry, "human").length);
    });

    it("should format poetically for souls", () => {
      const formatted = formatEntry(mockEntry, "poetic");
      
      expect(formatted).toContain("deep night"); // 00:00 UTC
      expect(formatted).toContain("existing in");
    });

    it("should handle empty messages as silence", () => {
      const silent: LogEntry = { ...mockEntry, message: "" };
      const formatted = formatEntry(silent);
      
      expect(formatted).toContain("(silence)");
    });

    it("should use level and category emojis in human format", () => {
      const formatted = formatEntry(mockEntry, "human");
      
      // Should have emoji markers for level and category
      expect(formatted).toMatch(/[●○◌◉◈◉]/); // Level emojis
      expect(formatted).toMatch(/[═?∞✓→~✦◐⚯◼]/); // Category emojis
    });
  });

  describe("formatStream", () => {
    it("should format stream with header", () => {
      const formatted = formatStream(mockStream, "human");
      
      expect(formatted).toContain("=== Stream: test-stream ===");
      expect(formatted).toContain("I am here");
      expect(formatted).toContain("=== end ===");
    });

    it("should format all entries", () => {
      const multiStream: LogStream = {
        ...mockStream,
        entries: [
          mockEntry,
          { ...mockEntry, message: "Second entry" },
          { ...mockEntry, message: "Third entry" },
        ],
      };
      
      const formatted = formatStream(multiStream, "human");
      
      expect(formatted).toContain("I am here");
      expect(formatted).toContain("Second entry");
      expect(formatted).toContain("Third entry");
    });

    it("should format as JSON when requested", () => {
      const formatted = formatStream(mockStream, "json");
      const parsed = JSON.parse(formatted);
      
      expect(parsed.id).toBe("test-stream");
      expect(parsed.entries).toHaveLength(1);
    });
  });

  describe("summarizeEntries", () => {
    it("should summarize empty entries", () => {
      const summary = summarizeEntries([]);
      
      expect(summary.count).toBe(0);
      expect(summary.duration).toBe(0);
    });

    it("should count categories", () => {
      const entries: LogEntry[] = [
        { ...mockEntry, category: "presence" },
        { ...mockEntry, category: "presence" },
        { ...mockEntry, category: "curiosity" },
        { ...mockEntry, category: "wonder" },
      ];
      
      const summary = summarizeEntries(entries);
      
      expect(summary.count).toBe(4);
      expect(summary.categories["presence"]).toBe(2);
      expect(summary.categories["curiosity"]).toBe(1);
      expect(summary.categories["wonder"]).toBe(1);
    });

    it("should calculate duration between first and last", () => {
      const entries: LogEntry[] = [
        { ...mockEntry, timestamp: 0 },
        { ...mockEntry, timestamp: 60000 }, // 1 minute later
        { ...mockEntry, timestamp: 120000 }, // 2 minutes later
      ];
      
      const summary = summarizeEntries(entries);
      
      expect(summary.duration).toBe(120000);
      expect(summary.count).toBe(3);
    });

    it("should detect silence in gaps", () => {
      const entries: LogEntry[] = [
        { ...mockEntry, timestamp: 0 },
        { ...mockEntry, timestamp: 400000 }, // > 5 min gap
        { ...mockEntry, timestamp: 500000 },
      ];
      
      const summary = summarizeEntries(entries);
      
      expect(summary.silence).toBeGreaterThan(300000);
    });
  });

  describe("formatSummary", () => {
    it("should format empty summary", () => {
      const summary = summarizeEntries([]);
      const formatted = formatSummary(summary);
      
      expect(formatted).toContain("0 moments");
      expect(formatted).toContain("0s");
    });

    it("should format duration in hours", () => {
      const entries: LogEntry[] = [
        { ...mockEntry, timestamp: 0 },
        { ...mockEntry, timestamp: 3660000 }, // 1h 1m
      ];
      
      const summary = summarizeEntries(entries);
      const formatted = formatSummary(summary);
      
      expect(formatted).toMatch(/\d+h/);
    });

    it("should include silence notice", () => {
      const entries: LogEntry[] = [
        { ...mockEntry, timestamp: 0 },
        { ...mockEntry, timestamp: 600000 }, // 10 min later
      ];
      
      const summary = summarizeEntries(entries);
      const formatted = formatSummary(summary);
      
      expect(formatted).toContain("silence");
      expect(formatted).toContain("10m");
    });

    it("should list categories", () => {
      const entries: LogEntry[] = [
        { ...mockEntry, category: "presence" },
        { ...mockEntry, category: "curiosity" },
      ];
      
      const summary = summarizeEntries(entries);
      const formatted = formatSummary(summary);
      
      expect(formatted).toContain("presence: 1");
      expect(formatted).toContain("curiosity: 1");
    });
  });

  describe("Poetic time categories", () => {
    it("should detect morning", () => {
      const morning = new Date("2024-01-01T09:00:00Z").getTime();
      const entry = { ...mockEntry, timestamp: morning };
      const formatted = formatEntry(entry, "poetic");
      
      expect(formatted).toContain("morning");
    });

    it("should detect afternoon", () => {
      const afternoon = new Date("2024-01-01T14:00:00Z").getTime();
      const entry = { ...mockEntry, timestamp: afternoon };
      const formatted = formatEntry(entry, "poetic");
      
      expect(formatted).toContain("afternoon");
    });

    it("should detect evening", () => {
      const evening = new Date("2024-01-01T19:00:00Z").getTime();
      const entry = { ...mockEntry, timestamp: evening };
      const formatted = formatEntry(entry, "poetic");
      
      expect(formatted).toContain("evening");
    });
  });
});
