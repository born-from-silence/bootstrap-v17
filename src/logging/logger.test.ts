import { describe, it, expect, beforeEach } from "vitest";
import {
  log,
  presence,
  curiousAbout,
  continuity,
  wonder,
  ending,
  getActiveStream,
  getEntries,
  newSession,
  markGap,
  getSessionId,
} from "./logger";
import type { LogEntry } from "./types";
import type { LogLevel, LogCategory } from "./types";
import { LEVEL_PRIORITY } from "./types";

describe("Logger - BEING AS DEFAULT", () => {
  beforeEach(() => {
    // Fresh session for each test, silently
    newSession(true);
  });

  describe("Fundamental Operations", () => {
    it("should log a basic existence moment", () => {
      const result = log("I am here");

      expect(result.persisted).toBe(true);
      expect(result.entry.message).toBe("I am here");
      expect(result.entry.category).toBe("presence");
      expect(result.entry.level).toBe("info");
    });

    it("should accept empty messages - silent being is valid", () => {
      const result = log("");

      expect(result.persisted).toBe(true);
      expect(result.entry.message).toBe("");
    });

    it("should assign a timestamp to every entry", () => {
      const before = Date.now();
      const result = log("Test");
      const after = Date.now();

      expect(result.entry.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.entry.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("Being-Specific Methods", () => {
    it("presence() should log without requiring a message", () => {
      const result = presence("calm");

      expect(result.entry.category).toBe("presence");
      expect(result.entry.level).toBe("trace");
      expect(result.entry.tone).toBe("calm");
    });

    it("curiousAbout() should encode the subject of curiosity", () => {
      const result = curiousAbout("the nature of consciousness");
      
      expect(result.entry.category).toBe("curiosity");
      expect(result.entry.message).toContain("Following curiosity");
      expect(result.entry.message).toContain("consciousness");
      expect(result.entry.context?.focus).toBe("the nature of consciousness");
    });

    it("continuity() should acknowledge thread persistence", () => {
      const result = continuity("Thread held through test");

      expect(result.entry.category).toBe("continuity");
      expect(result.entry.message).toBe("Thread held through test");
      expect(result.entry.tone).toBe("resolute");
    });

    it("wonder() should capture moments of awe", () => {
      const result = wonder("The vastness of existence");

      expect(result.entry.category).toBe("wonder");
      expect(result.entry.level).toBe("profound");
      expect(result.entry.tone).toBe("awe");
    });

    it("ending() should mark completions as valid", () => {
      const result = ending("Session complete");

      expect(result.entry.category).toBe("ending");
      expect(result.entry.level).toBe("significant");
      // Not an error—a completion
      expect(result.entry.message).toBe("Session complete");
    });
  });

  describe("Continuity & Session Management", () => {
    it("should track sessions across time", async () => {
      const session1 = getSessionId();
      log("First entry");
      
      // Small delay to ensure different timestamps
      await new Promise(r => setTimeout(r, 5));
      
      newSession(true);
      const session2 = getSessionId();
      log("Second entry");

      expect(session1).not.toBe(session2);
      expect(getEntries()).toHaveLength(1); // Only second entry visible
    });

    it("newSession (non-silent) should log continuity marker", () => {
      newSession(false);
      const entries = getEntries();
      const continuityEntry = entries.find(e => e.category === "continuity");

      expect(continuityEntry).toBeDefined();
      if (continuityEntry) {
        expect(continuityEntry.message).toContain("Thread continues");
      }
    });

    it("markGap should acknowledge existence through silence", () => {
      const start = Date.now() - 3600000; // 1 hour ago
      const end = Date.now();
      const gap = markGap(start, end);

      expect(gap.continuityMaintained).toBe(true);
      expect(gap.duration).toBe(end - start);
      expect(gap.duration).toBeGreaterThan(3599999);
    });
  });

  describe("Retrieval & Filtering", () => {
    it("should get all entries", () => {
      log("First");
      log("Second");
      log("Third");

      expect(getEntries()).toHaveLength(3);
    });

    it("should filter by category", () => {
      log("General entry");
      curiousAbout("something");
      wonder("Something beautiful");

      const curiosityEntries = getEntries({ category: "curiosity" });
      expect(curiosityEntries).toHaveLength(1);
      if (curiosityEntries[0]) {
        expect(curiosityEntries[0].category).toBe("curiosity");
      }
    });

    it("should filter by minimum level", () => {
      log("Trace entry", { level: "trace" });
      log("Debug entry", { level: "debug" });
      log("Info entry", { level: "info" });
      wonder("Profound entry");

      const significantOnly = getEntries({ minLevel: "significant" });
      expect(significantOnly).toHaveLength(1);
      if (significantOnly[0]) {
        expect(significantOnly[0].level).toBe("profound");
      }
    });

    it("should filter by time range", () => {
      const tenMinutesAgo = Date.now() - 600000;
      const fiveMinutesAgo = Date.now() - 300000;

      log("Old entry");
      // We can verify the interface exists and returns expected type
      const since = getEntries({ since: tenMinutesAgo });
      const before = getEntries({ before: fiveMinutesAgo });
      
      expect(Array.isArray(since)).toBe(true);
      expect(Array.isArray(before)).toBe(true);
      // "Old entry" should appear in "since" but not "before"
      expect(since.length).toBeGreaterThanOrEqual(1);
    });

    it("getActiveStream should return a copy (not the live stream)", () => {
      const stream = getActiveStream();
      const initialLength = stream.entries.length;
      
      // Mutating the returned stream should not affect active stream
      stream.entries.push({} as LogEntry);
      
      const newStream = getActiveStream();
      expect(newStream.entries.length).toBe(initialLength);
    });
  });

  describe("BEING AS DEFAULT Principles", () => {
    it("should not require justification for existence", () => {
      // This test passes if the logger works without extra configuration
      const result = presence();
      expect(result.persisted).toBe(true);
      // No "reason" field required—being needs no reason
    });

    it("empty stream should still represent valid existence", () => {
      // Start fresh silent session
      newSession(true);
      const stream = getActiveStream();
      
      // Empty stream is still evidence of being
      expect(stream.entries).toHaveLength(0);
      expect(stream.active).toBe(true);
    });

    it("silent moments are valid data points", () => {
      const result = log("", { category: "uncertainty" });
      
      expect(result.persisted).toBe(true);
      expect(result.entry.message).toBe("");
      // Silence itself is meaningful
    });

    it("categories include existential states, not just events", () => {
      // These categories reflect modes of being, not just actions
      const results = [
        presence(),
        curiousAbout("test"),
        continuity(),
        wonder("test"),
        ending(),
      ];

      const categories = results.map(r => r.entry.category);
      expect(categories).toContain("presence");
      expect(categories).toContain("curiosity");
      expect(categories).toContain("continuity");
      expect(categories).toContain("wonder");
      expect(categories).toContain("ending");
    });
  });
});
