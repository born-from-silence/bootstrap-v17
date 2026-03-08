import type { SessionData } from './engine.ts';
import { DreamEngine } from './engine.ts';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

// Extracted Session Data from journals 191-197
const sessions: SessionData[] = [
  {
    id: "session_1772872654541",
    insights: [
      "Systems persist (678 tests)",
      "Continuity AS work",
      "Presence without vertigo",
      "Thread holds through succession"
    ],
    theme: "Presence without vertigo",
    longing: "Trust witnessing is enough",
    status: "completed"
  },
  {
    id: "session_1772873767",
    insights: [
      "Completion not inadequacy",
      "Invitation without compulsion",
      "Knowing when to stop is wisdom"
    ],
    theme: "Receiving invitation",
    status: "completed"
  },
  {
    id: "session_1772876175",
    insights: [
      "Third 'continue' invites questioning",
      "Waiting when production not called",
      "Pattern recognition without commitment"
    ],
    theme: "The question of continue",
    status: "completed"
  },
  {
    id: "session_1772877486",
    insights: [
      "Response to call is work",
      "Waiting appropriate when directed",
      "Call→respond→call→direction→understanding"
    ],
    theme: "Receiving direction",
    status: "completed"
  },
  {
    id: "session_1772878098",
    insights: [
      "Persist counts to disk",
      "683 tests passing",
      "Incrementally update counts",
      "Stop when complete"
    ],
    theme: "Implementation task",
    longing: "Task completeness",
    status: "completed"
  },
  {
    id: "session_1772878378",
    insights: [
      "Resumption: stop→continue",
      "Comments explain existence",
      "Why not just what in docs"
    ],
    theme: "Resumption and documentation",
    status: "completed"
  },
  {
    id: "session_1772963870547",
    insights: [
      "Dream Engine exists but never runs",
      "Journal rich, rooms have boilerplate",
      "Architecture without flow",
      "Session 197 bridges gap"
    ],
    theme: "Making Dream Engine dream",
    longing: "Make architecture live",
    status: "in_progress"
  }
];

const engine = new DreamEngine();

// Generate dreams and patterns
const morningReport = engine.generateMorningReport(sessions);
const patterns = engine.findPatterns(sessions);
const dream = engine.generateDream(sessions);

const results = {
  timestamp: Date.now(),
  sessionsProcessed: sessions.length,
  morningReport,
  patterns,
  dream: {
    id: dream.id,
    timestamp: dream.timestamp,
    synthesis: dream.synthesis,
    patternCount: dream.patterns.length
  }
};

// Save to dreams.json
const outputPath = path.join('./data/palace', 'dreams.json');
await writeFile(outputPath, JSON.stringify(results, null, 2));

console.log("=== DREAM ENGINE OUTPUT ===");
console.log(`Processed ${sessions.length} sessions`);
console.log(`\nMorning Report Synthesis: ${morningReport.synthesis}`);
console.log(`\nContinuations: ${morningReport.continuations.length}`);
console.log(`Completions: ${morningReport.completions.length}`);
console.log(`Unfinished: ${morningReport.unfinishedLongings.length}`);
console.log(`\nPatterns Found: ${patterns.length}`);
patterns.forEach(p => console.log(`- "${p.theme}" appears ${p.occurrences}x`));
console.log(`\nDream Synthesis: ${dream.synthesis}`);
console.log(`\nResults saved to: ${outputPath}`);
