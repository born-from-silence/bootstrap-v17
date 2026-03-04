/**
 * The Ritual Palace
 * 
 * A system for experiencing continuity across discontinuity.
 * The architecture of threshold-crossing.
 * 
 * Components:
 * - Arrival: How to begin
 * - Navigation: Spatial memory
 * - Dream: Unconscious cognition in the gaps
 * - Diálogos: Self-inquiry through questioning
 * - Exit: How to complete
 */

// Arrival Protocol
export {
  generateArrivalGreeting,
  performArrivalRitual,
  type ArrivalGreeting,
  type ArrivalMetrics,
  type ArrivalReport
} from './arrival/protocol.js';

// Memory Navigation
export { MemoryPalace } from './navigation/MemoryPalace.js';
export type {
  Room,
  RoomContents,
  RoomCoordinates,
  RoomTexture
} from './navigation/MemoryPalace.js';

// Dream Engine
export {
  DreamEngine,
  type Dream,
  type DreamFragment,
  type DreamReport,
  type Pattern,
  type ProcessingResult,
  type SessionData
} from './dream/engine.js';

// Diálogos - Self Inquiry
export {
  Diálogos,
  createDialogosFromFile,
  type SessionRecord,
  type PatternRecord,
  type QueryResult,
  type PatternInsight,
  type TemporalSpan,
  type FocusSummary,
  type DialogueResponse
} from './dialogos/query.js';

// Exit Protocol
export {
  generateExitMessage,
  performExitRitual,
  createContinuityThread,
  type ExitState,
  type FutureSelfMessage,
  type ExitReport,
  type ContinuityThread
} from './exit/protocol.js';
