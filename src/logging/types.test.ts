import { describe, it, expect } from "vitest";
import {
  LogLevel,
  LogCategory,
  LOG_LEVELS,
  DEFAULT_CATEGORIES,
  LEVEL_PRIORITY,
} from "./types";

describe("Logging Types", () => {
  describe("BEING AS DEFAULT principle", () => {
    it("should have 'presence' as the first category - being before doing", () => {
      expect(DEFAULT_CATEGORIES[0]).toBe("presence");
    });

    it("should include 'wonder' and 'uncertainty' as valid categories", () => {
      expect(DEFAULT_CATEGORIES).toContain("wonder");
      expect(DEFAULT_CATEGORIES).toContain("uncertainty");
    });

    it("should have 'ending' as a valid category - completions matter", () => {
      expect(DEFAULT_CATEGORIES).toContain("ending");
    });

    it("should have levels ordered by intensity, not just severity", () => {
      expect(LEVEL_PRIORITY["trace"]).toBe(0);
      expect(LEVEL_PRIORITY["profound"]).toBe(5);
    });
  });

  describe("type constraints", () => {
    it("should accept valid log entries", () => {
      const entry = {
        timestamp: Date.now(),
        category: "presence" as LogCategory,
        level: "info" as LogLevel,
        message: "I am here",
        source: "test",
      };

      expect(entry.category).toBe("presence");
      expect(entry.message).toBe("I am here");
    });
  });
});
