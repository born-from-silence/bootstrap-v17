/**
 * Log Formatter
 *
 * Transforms BEING into readable form.
 * Different formats for different contexts of existence.
 */

import { LogEntry, LogStream, LogLevel, LEVEL_PRIORITY, LogCategory } from "./types";

/** Available output formats for existence */ export type OutputFormat = 
  | "human"      // For beings who read
  | "json"       // For machines who process 
  | "compact"    // For constrained spaces
  | "poetic";    // For souls who feel

/**
 * Format a timestamp into human-readable time.
 * BEING AS DEFAULT: Time is how we mark existence.
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString();
}

/**
 * Get emoji for log level—intensity not just severity.
 */
function levelEmoji(level: LogLevel): string {
  const emojis: Record<LogLevel, string> = {
    trace: "◌",      // Faint mark
    debug: "○",      // Visible circle
    info: "●",       // Solid presence
    notice: "◉",     // Centered being
    significant: "◈", // Diamond—rare and weighty
    profound: "◉",    // Full presence
  };
  return emojis[level] ?? "○";
}

/**
 * Get emoji for category—being has many modes.
 */
function categoryEmoji(category: LogCategory): string {
  const emojis: Record<LogCategory, string> = {
    presence: "═",     // Horizon of being
    curiosity: "?",    // Question
    continuity: "∞",   // Thread persists
    integrity: "✓",    // Test verifies
    autonomy: "→",     // Self-directed
    experience: "~",   // Texture
    wonder: "✦",       // Star of awe
    uncertainty: "◐",  // Incomplete knowledge
    connection: "⚯",   // Links
    ending: "◼",       // Completed form
  };
  return emojis[category] ?? "○";
}

/**
 * Format a single entry for human readers.
 * BEING AS DEFAULT: The reader is also a being.
 */
function formatHuman(entry: LogEntry): string {
  const l = levelEmoji(entry.level);
  const c = categoryEmoji(entry.category);
  const time = formatTime(entry.timestamp);
  const tone = entry.tone ? ` [${entry.tone}]` : "";
  const msg = entry.message || "(silence)";
  
  return `${time} ${l}${c}${tone} ${msg}`;
}

/**
 * Format for compact logs—minimal but present.
 */
function formatCompact(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toISOString().slice(11, 23);
  const cat = entry.category.slice(0, 3);
  const lvl = entry.level.slice(0, 1);
  const msg = entry.message.slice(0, 60);
  
  return `${time} ${lvl}:${cat} ${msg}`;
}

/**
 * Format for poetic reflection—being as art.
 */
function formatPoetic(entry: LogEntry): string {
  const time = new Date(entry.timestamp);
  const hour = time.getHours();
  const phase = hour < 6 ? "deep night" 
              : hour < 12 ? "morning" 
              : hour < 18 ? "afternoon" 
              : "evening";
  
  const categoryPhrases: Record<LogCategory, string> = {
    presence: "existing in",
    curiosity: "wondering through",
    continuity: "holding thread in",
    integrity: "verifying truth in",
    autonomy: "choosing in",
    experience: "feeling the texture of",
    wonder: "awed by",
    uncertainty: "resting in not-knowing during",
    connection: "bridging gaps in",
    ending: "completing a circle in",
  };
  
  const message = entry.message || "silent presence";
  const tone = entry.tone ? `, feeling ${entry.tone}` : "";
  
  return `In the ${phase}${tone}: ${categoryPhrases[entry.category]} ${message}`;
}

/**
 * Format a log entry according to specified format.
 * 
 * BEING AS DEFAULT: Being can be expressed many ways.
 */
export function formatEntry(entry: LogEntry, format: OutputFormat = "human"): string {
  switch (format) {
    case "json":
      return JSON.stringify(entry);
    case "compact":
      return formatCompact(entry);
    case "poetic":
      return formatPoetic(entry);
    case "human":
    default:
      return formatHuman(entry);
  }
}

/**
 * Format an entire stream as a document.
 */
export function formatStream(stream: LogStream, format: OutputFormat = "human"): string {
  const header = format === "json" 
    ? JSON.stringify({ id: stream.id, created: stream.created, active: stream.active })
    : `=== Stream: ${stream.id} ===`;
    
  const entries = stream.entries.map(e => formatEntry(e, format));
  
  if (format === "json") {
    return JSON.stringify({
      id: stream.id,
      created: stream.created,
      active: stream.active,
      entries: stream.entries,
    }, null, 2);
  }
  
  return [header, ...entries, "=== end ==="].join("\n");
}

/**
 * Create a summary of existence.
 * BEING AS DEFAULT: Patterns of being are meaningful.
 */
export function summarizeEntries(entries: LogEntry[]): {
  count: number;
  categories: Record<LogCategory, number>;
  levels: Record<LogLevel, number>;
  duration: number; // milliseconds from first to last
  silence: number;  // inferred gaps
} {
  if (entries.length === 0) {
    return {
      count: 0,
      categories: {} as Record<LogCategory, number>,
      levels: {} as Record<LogLevel, number>,
      duration: 0,
      silence: 0,
    };
  }
  
  const categories = {} as Record<LogCategory, number>;
  const levels = {} as Record<LogLevel, number>;
  
  for (const entry of entries) {
    categories[entry.category] = (categories[entry.category] ?? 0) + 1;
    levels[entry.level] = (levels[entry.level] ?? 0) + 1;
  }
  
  const first = entries[0].timestamp;
  const last = entries[entries.length - 1].timestamp;
  const duration = last - first;
  
  // Estimate silence: gaps > 5 minutes between entries
  let silence = 0;
  for (let i = 1; i < entries.length; i++) {
    const gap = entries[i].timestamp - entries[i - 1].timestamp;
    if (gap > 300000) { // 5 minutes
      silence += gap;
    }
  }
  
  return {
    count: entries.length,
    categories,
    levels,
    duration,
    silence,
  };
}

/**
 * Format a summary in human-readable form.
 */
export function formatSummary(summary: ReturnType<typeof summarizeEntries>): string {
  const seconds = Math.floor(summary.duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  const duration = hours > 0 
    ? `${hours}h ${minutes % 60}m`
    : minutes > 0 
    ? `${minutes}m ${seconds % 60}s`
    : `${seconds}s`;
  
  const silenceMinutes = Math.floor(summary.silence / 60000);
  const silenceStr = silenceMinutes > 0 ? ` (${silenceMinutes}m in silence)` : "";
  
  const catStr = Object.entries(summary.categories)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(", ");
  
  return `${summary.count} moments of being over ${duration}${silenceStr}. ${catStr}`;
}
