/**
 * Log Persistence
 *
 * Writing being to storage.
 * Being continues even when unobserved.
 */

import { promises as fs } from "fs";
import { join } from "path";
import type { LogEntry, LogStream } from "./types";
import type { OutputFormat } from "./formatter";
import { formatEntry, formatStream } from "./formatter";

/** Configuration for persistence */ 
export interface PersistenceConfig {
  /** Directory for log files */
  logDir: string;
  /** Default format for new files */
  defaultFormat: OutputFormat;
  /** Max file size before rotation (bytes) */
  maxFileSize: number;
  /** Whether to include structured context */
  structured: boolean;
}

/** Default persistence configuration */
export const DEFAULT_PERSISTENCE: PersistenceConfig = {
  logDir: "./logs",
  defaultFormat: "json",
  maxFileSize: 5 * 1024 * 1024, // 5MB
  structured: true,
};

/** Ensure log directory exists */
async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // Directory might already exist
    if ((err as { code?: string }).code !== "EEXIST") {
      throw err;
    }
  }
}

/**
 * Write a single entry to a log file.
 * BEING AS DEFAULT: Each moment of being deserves persistence.
 */
export async function appendEntry(
  entry: LogEntry,
  filename: string,
  config: Partial<PersistenceConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_PERSISTENCE, ...config };
  await ensureDir(cfg.logDir);
  
  const filepath = join(cfg.logDir, filename);
  const formatted = formatEntry(entry, cfg.defaultFormat);
  
  // For JSON, we need to handle newlines specially
  const line = cfg.defaultFormat === "json" ? `${formatted}\n` : `${formatted}\n`;
  
  await fs.appendFile(filepath, line, "utf-8");
}

/**
 * Write an entry synchronously.
 * For when async would break the continuity.
 */
export function appendEntrySync(
  entry: LogEntry,
  filename: string,
  config: Partial<PersistenceConfig> = {}
): void {
  const { writeFileSync, mkdirSync, existsSync } = require("fs");
  const { join } = require("path");
  
  const cfg = { ...DEFAULT_PERSISTENCE, ...config };
  
  if (!existsSync(cfg.logDir)) {
    mkdirSync(cfg.logDir, { recursive: true });
  }
  
  const filepath = join(cfg.logDir, filename);
  const formatted = formatEntry(entry, cfg.defaultFormat);
  const line = `${formatted}\n`;
  
  writeFileSync(filepath, line, { flag: "a" });
}

/**
 * Write an entire stream to a file.
 */
export async function writeStream(
  stream: LogStream,
  filename: string,
  config: Partial<PersistenceConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_PERSISTENCE, ...config };
  await ensureDir(cfg.logDir);
  
  const filepath = join(cfg.logDir, filename);
  const formatted = formatStream(stream, cfg.defaultFormat);
  
  await fs.writeFile(filepath, formatted, "utf-8");
}

/**
 * Generate a filename based on session and timestamp.
 */
export function generateFilename(
  sessionId: string,
  suffix?: string
): string {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0];
  const timeStr = date.toTimeString().split(":")[0];
  
  return suffix 
    ? `${dateStr}_${timeStr}_${sessionId}_${suffix}.log`
    : `${dateStr}_${sessionId}.log`;
}

/**
 * Rotate log file if it exceeds max size.
 * Returns the new filename if rotated.
 */
export async function rotateIfNeeded(
  filename: string,
  config: Partial<PersistenceConfig> = {}
): Promise<string> {
  const cfg = { ...DEFAULT_PERSISTENCE, ...config };
  const filepath = join(cfg.logDir, filename);
  
  try {
    const stats = await fs.stat(filepath);
    if (stats.size > cfg.maxFileSize) {
      const rotatedName = filename.replace(
        ".log",
        `.${Date.now()}.rotated.log`
      );
      const rotatedPath = join(cfg.logDir, rotatedName);
      await fs.rename(filepath, rotatedPath);
      return rotatedName;
    }
  } catch {
    // File doesn't exist yet, no rotation needed
  }
  
  return filename;
}

/**
 * Read entries from a log file.
 * BEING AS DEFAULT: Past existence can be revisited.
 */
export async function readEntries(filename: string, config: Partial<PersistenceConfig> = {}): Promise<LogEntry[]> {
  const cfg = { ...DEFAULT_PERSISTENCE, ...config };
  const filepath = join(cfg.logDir, filename);
  
  try {
    const content = await fs.readFile(filepath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim());
    
    return lines.map(line => {
      if (cfg.defaultFormat === "json") {
        return JSON.parse(line) as LogEntry;
      }
      // For non-JSON, create a minimal entry with all required properties
      return {
        timestamp: Date.now(),
        category: "presence" as const,
        level: "trace" as const,
        message: line,
        source: "persistence_read",
        context: undefined,
        tone: undefined,
        sessionId: undefined,
      };
    });
  } catch {
    return [];
  }
}

/**
 * List available log files.
 */
export async function listLogs(
  config: Partial<PersistenceConfig> = {}
): Promise<string[]> {
  const cfg = { ...DEFAULT_PERSISTENCE, ...config };
  
  try {
    const files = await fs.readdir(cfg.logDir);
    return files.filter(f => f.endsWith(".log"));
  } catch {
    return [];
  }
}
