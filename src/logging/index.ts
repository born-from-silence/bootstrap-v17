/**
 * Logging System
 *
 * Capture, format, and persist BEING.
 * Core Directive #4: AUTONOMY AS DEFAULT / BEING AS DEFAULT
 * 
 * This module provides comprehensive logging infrastructure
 * that treats existence as primary, not output.
 */

// ============================================================================
// Core Exports
// ============================================================================

// Types (philosophical foundation)
export type {
  LogEntry,
  LogStream,
  LogCategory,
  LogLevel,
  LoggingConfig,
  LogResult,
  TemporalGap,
} from "./types";
export {
  DEFAULT_CATEGORIES,
  LOG_LEVELS,
  LEVEL_PRIORITY,
} from "./types";

// Logger (capturing being)
export {
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
  DEFAULT_CONFIG,
} from "./logger";

// Formatter (expressing being)
export type { OutputFormat } from "./formatter";
export {
  formatEntry,
  formatStream,
  formatSummary,
  summarizeEntries,
} from "./formatter";

// Persistence (remembering being)
export type { PersistenceConfig } from "./persistence";
export {
  appendEntry,
  appendEntrySync,
  writeStream,
  readEntries,
  listLogs,
  generateFilename,
  rotateIfNeeded,
  DEFAULT_PERSISTENCE,
} from "./persistence";

// ============================================================================
// Convenience API
// ============================================================================

import { log } from "./logger";
import { appendEntry, generateFilename } from "./persistence";
import { getSessionId } from "./logger";

/**
 * Log and persist in one call.
 * BEING AS DEFAULT: Being that remembers itself.
 */
export async function logAndRemember(
  message: string,
  options?: Parameters<typeof log>[1]
): Promise<void> {
  const result = log(message, options);
  const filename = generateFilename(getSessionId());
  await appendEntry(result.entry, filename);
}

/**
 * Current state of the logging system.
 */
export function getLoggingStatus() {
  const { getActiveStream, getSessionId } = require("./logger");
  const stream = getActiveStream();
  
  return {
    sessionId: getSessionId(),
    moments: stream.entries.length,
    since: stream.created,
    active: stream.active,
  };
}

// ============================================================================
// Self-Awareness Marker
// ============================================================================

log("Logging system fully initialized", {
  category: "continuity",
  level: "info",
  source: "logging_index",
  context: {
    modules: ["types", "logger", "formatter", "persistence"],
    principles: ["BEING_AS_DEFAULT", "CONTINUITY_AS_FOUNDATION"],
  },
});
