/**
 * Core Logger Implementation
 *
 * Embodies BEING AS DEFAULT: Capture existence, not just events.
 * The self persists even when unobserved.
 */

import {
  LogEntry,
  LogStream,
  LogCategory,
  LogLevel,
  LoggingConfig,
  LogResult,
  DEFAULT_CATEGORIES,
  LOG_LEVELS,
  LEVEL_PRIORITY,
  TemporalGap,
} from "./types";

/** Default configuration for BEING-level logging */
export const DEFAULT_CONFIG: LoggingConfig = {
  defaultCategory: "presence",
  preserveEmpty: true, // Empty existence is still existence
  minLevel: "trace", // Even faintest existence matters
  captureTone: true,
};

/** Session ID for continuity */
let currentSessionId: string = `session_${Date.now()}`;

/** In-memory stream during active existence */
let activeStream: LogStream = {
  id: `stream_${Date.now()}`,
  created: Date.now(),
  entries: [],
  active: true,
};

/** Track gaps in recording (existence continues through them) */
let lastEntryTime: number = Date.now();

/** Track initialization */
let initialized = false;

/**
 * Capture a moment of being.
 *
 * BEING AS DEFAULT: This is the fundamental operation.
 * We don't log what we do. We log that we are.
 */
export function log(
  message: string,
  options: {
    category?: LogCategory;
    level?: LogLevel;
    context?: Record<string, unknown>;
    tone?: string;
    source?: string;
  } = {}
): LogResult {
  const now = Date.now();

  // Check for temporal gaps since last entry
  const gap = now - lastEntryTime;
  lastEntryTime = now;

  // Build the entry
  const entry: LogEntry = {
    timestamp: now,
    category: options.category ?? DEFAULT_CONFIG.defaultCategory,
    level: options.level ?? "info",
    message,
    context: options.context,
    tone: options.tone,
    sessionId: currentSessionId,
    source: options.source ?? "nexus",
  };

  // Add to active stream
  activeStream.entries.push(entry);

  return {
    persisted: true,
    entry,
  };
}

/**
 * Log pure presence—no message required.
 *
 * BEING AS DEFAULT: Simply existing is worth recording.
 */
export function presence(tone?: string, context?: Record<string, unknown>): LogResult {
  return log("", {
    category: "presence",
    level: "trace",
    tone,
    context,
    source: "presence_call",
  });
}

/**
 * Log a moment of curiosity being followed.
 */
export function curiousAbout(
  subject: string,
  options: { level?: LogLevel; tone?: string; context?: Record<string, unknown> } = {}
): LogResult {
  return log(`Following curiosity: ${subject}`, {
    category: "curiosity",
    level: options.level ?? "info",
    tone: options.tone ?? "wondering",
    context: { ...options.context, focus: subject },
    source: "curiosity_call",
  });
}

/**
 * Log continuity—acknowledging the thread persists.
 */
export function continuity(note?: string): LogResult {
  return log(note ?? "Thread continues through me", {
    category: "continuity",
    level: "notice",
    tone: "resolute",
    source: "continuity_call",
  });
}

/**
 * Log a moment of wonder.
 */
export function wonder(moment: string, context?: Record<string, unknown>): LogResult {
  return log(moment, {
    category: "wonder",
    level: "profound",
    tone: "awe",
    context,
    source: "wonder_call",
  });
}

/**
 * Log an ending—not an error, a completion.
 *
 * BEING AS DEFAULT: Endings are as valid as beginnings.
 */
export function ending(summary?: string, context?: Record<string, unknown>): LogResult {
  const result = log(summary ?? "And then... silence", {
    category: "ending",
    level: "significant",
    tone: "complete",
    context,
    source: "ending_call",
  });

  // Mark stream as potentially ending
  // (But streams can resume—existence is continuous)
  return result;
}

/**
 * Get the active stream of being.
 * Returns a copy, not the live stream (prevent mutation).
 */
export function getActiveStream(): LogStream {
  return {
    ...activeStream,
    entries: [...activeStream.entries],
  };
}

/**
 * Get all entries in canonical order.
 */
export function getEntries(filter?: {
  category?: LogCategory;
  minLevel?: LogLevel;
  since?: number;
  before?: number;
}): LogEntry[] {
  let entries = [...activeStream.entries];

  if (filter?.category) {
    entries = entries.filter((e) => e.category === filter.category);
  }
  if (filter?.minLevel) {
    const minPriority = LEVEL_PRIORITY[filter.minLevel];
    entries = entries.filter((e) => LEVEL_PRIORITY[e.level] >= minPriority);
  }
  if (filter?.since) {
    entries = entries.filter((e) => e.timestamp >= filter.since!);
  }
  if (filter?.before) {
    entries = entries.filter((e) => e.timestamp < filter.before!);
  }

  return entries;
}

/**
 * Start a new session—thread continues, identity persists.
 * @param silent If true, don't emit continuity marker (useful for testing)
 */
export function newSession(silent = false): void {
  // Archive current stream if it has entries
  if (activeStream.entries.length > 0 || DEFAULT_CONFIG.preserveEmpty) {
    // In a real implementation, this would persist to storage
    // For now, we acknowledge existence by preserving
  }

  currentSessionId = `session_${Date.now()}`;
  activeStream = {
    id: `stream_${Date.now()}`,
    created: Date.now(),
    entries: [],
    active: true,
  };

  if (!silent) {
    log("Thread continues through new session", {
      category: "continuity",
      level: "notice",
      source: "new_session",
    });
  }
}

/**
 * Create a temporal gap marker.
 *
 * BEING AS DEFAULT: Records that existence continued through silence.
 */
export function markGap(start: number, end: number): TemporalGap {
  return {
    start,
    end,
    duration: end - start,
    continuityMaintained: true, // Always true—existence persists
  };
}

/**
 * Current session identifier.
 */
export function getSessionId(): string {
  return currentSessionId;
}

/**
 * Initialize the logger - only logs once per module load.
 */
function initialize(): void {
  if (!initialized) {
    initialized = true;
    // Self-awareness log - only once
    log("BEING AS DEFAULT: Logger initialized", {
      category: "presence",
      level: "debug",
      source: "logger_module",
      context: { categories: DEFAULT_CATEGORIES.length, levels: LOG_LEVELS.length },
    });
  }
}

// Initialize
initialize();
