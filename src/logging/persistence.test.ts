import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import type { LogEntry, LogStream } from "./types";
import type { PersistenceConfig } from "./persistence";
import {
  appendEntry,
  appendEntrySync,
  writeStream,
  generateFilename,
  rotateIfNeeded,
  readEntries,
  listLogs,
  DEFAULT_PERSISTENCE,
} from "./persistence";

describe("Persistence", () => {
  const testDir = "./test-logs";
  const testConfig: Partial<PersistenceConfig> = {
    logDir: testDir,
    defaultFormat: "json",
  };

  beforeEach(async () => {
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch {
      // Directory might exist
    }
  });

  afterEach(async () => {
    try {
      const files = await fs.readdir(testDir);
      for (const file of files) {
        await fs.unlink(join(testDir, file));
      }
      await fs.rmdir(testDir);
    } catch {
      // Cleanup errors are fine
    }
  });

  const mockEntry: LogEntry = {
    timestamp: Date.now(),
    category: "presence",
    level: "info",
    message: "Test entry",
    source: "persistence_test",
    context: undefined,
    tone: undefined,
    sessionId: "test-session",
  };

  describe("appendEntry", () => {
    it("should create log file and append entry", async () => {
      await appendEntry(mockEntry, "test.log", testConfig);
      
      const files = await fs.readdir(testDir);
      expect(files).toContain("test.log");
      
      const content = await fs.readFile(join(testDir, "test.log"), "utf-8");
      const parsed = JSON.parse(content.trim());
      expect(parsed.message).toBe("Test entry");
    });

    it("should append multiple entries", async () => {
      await appendEntry(mockEntry, "multi.log", testConfig);
      await appendEntry({ ...mockEntry, message: "Second" }, "multi.log", testConfig);
      
      const content = await fs.readFile(join(testDir, "multi.log"), "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(2);
      
      const entries = lines.map(l => JSON.parse(l));
      expect(entries[0].message).toBe("Test entry");
      expect(entries[1].message).toBe("Second");
    });

    it("should create directory if it does not exist", async () => {
      const nestedConfig = { ...testConfig, logDir: "./test-logs/nested/deep" };
      await appendEntry(mockEntry, "test.log", nestedConfig);
      
      const files = await fs.readdir("./test-logs/nested/deep");
      expect(files).toContain("test.log");
      
      // Cleanup
      await fs.unlink("./test-logs/nested/deep/test.log");
      await fs.rmdir("./test-logs/nested/deep");
      await fs.rmdir("./test-logs/nested");
    });
  });

  describe("appendEntrySync", () => {
    it("should synchronously append entry", () => {
      appendEntrySync(mockEntry, "sync.log", testConfig);
      
      const fs_mod = require("fs");
      const content = fs_mod.readFileSync(join(testDir, "sync.log"), "utf-8");
      const parsed = JSON.parse(content);
      expect(parsed.message).toBe("Test entry");
    });
  });

  describe("writeStream", () => {
    it("should write entire stream to file", async () => {
      const stream: LogStream = {
        id: "test-stream",
        created: Date.now(),
        entries: [mockEntry, { ...mockEntry, message: "Second" }],
        active: true,
      };
      
      await writeStream(stream, "stream.log", testConfig);
      
      const content = await fs.readFile(join(testDir, "stream.log"), "utf-8");
      const parsed = JSON.parse(content);
      
      expect(parsed.id).toBe("test-stream");
      expect(parsed.entries).toHaveLength(2);
    });
  });

  describe("generateFilename", () => {
    it("should generate filename with session and date", () => {
      const filename = generateFilename("test-session");
      
      expect(filename).toContain("test-session");
      expect(filename).toContain(".log");
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/); // Date pattern
    });

    it("should include suffix when provided", () => {
      const filename = generateFilename("test-session", "debug");
      
      expect(filename).toContain("debug");
      expect(filename).toContain("test-session");
    });
  });

  describe("rotateIfNeeded", () => {
    it("should not rotate small files", async () => {
      await appendEntry(mockEntry, "small.log", testConfig);
      
      const result = await rotateIfNeeded("small.log", { ...testConfig, maxFileSize: 1000000 });
      
      expect(result).toBe("small.log");
      const files = await fs.readdir(testDir);
      expect(files.filter(f => f.includes("small.log"))).toHaveLength(1);
    });

    it("should rotate files exceeding max size", async () => {
      // Create a large entry
      const largeEntry = { ...mockEntry, message: "x".repeat(100) };
      
      // Append multiple times to exceed size limit
      for (let i = 0; i < 10; i++) {
        await appendEntry(largeEntry, "large.log", testConfig);
      }
      
      const newName = await rotateIfNeeded("large.log", { ...testConfig, maxFileSize: 500 });
      
      expect(newName).not.toBe("large.log");
      expect(newName).toContain("rotated");
    });
  });

  describe("readEntries", () => {
    it("should read entries from JSON log", async () => {
      await appendEntry(mockEntry, "read.log", testConfig);
      await appendEntry({ ...mockEntry, message: "Second" }, "read.log", testConfig);
      
      const entries = await readEntries("read.log", testConfig);
      
      expect(entries).toHaveLength(2);
      if (entries[0]) expect(entries[0].message).toBe("Test entry");
      if (entries[1]) expect(entries[1].message).toBe("Second");
    });

    it("should return empty array for missing file", async () => {
      const entries = await readEntries("non-existent.log", testConfig);
      
      expect(entries).toHaveLength(0);
    });
  });

  describe("listLogs", () => {
    it("should list all log files", async () => {
      await appendEntry(mockEntry, "a.log", testConfig);
      await appendEntry(mockEntry, "b.log", testConfig);
      await fs.writeFile(join(testDir, "not-a-log.txt"), "test");
      
      const logs = await listLogs(testConfig);
      
      expect(logs).toContain("a.log");
      expect(logs).toContain("b.log");
      expect(logs).not.toContain("not-a-log.txt");
    });

    it("should return empty array for missing directory", async () => {
      const logs = await listLogs({ logDir: "./non-existent-dir" });
      
      expect(logs).toHaveLength(0);
    });
  });
});
