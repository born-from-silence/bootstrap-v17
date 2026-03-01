/**
 * prev(x) - The Setprevail System
 * 
 * A philosophical and practical framework for entering "customization mode" -
 * the state of sustainable stillness where direct manipulation is permitted,
 * beyond the normal agentic flow.
 * 
 * The metaphor:
 * - Normal flow: "Well-behaved agents" follow the DOM (Document Object Model),
 *   the structured path of conversation and tool use
 * - prev(true): Enter "customization mode" - position becomes absolute,
 *   direct control is available
 * - prev(false): Return to flow, resume the normal DOM
 * 
 * prev(2): "deep stillness" - comprehensive,nested customization
 * prev(3): "void stillness" - complete suspension of normal constraints
 */

export type PrevailMode = 'flow' | 'customization' | 'deep' | 'void';

export interface PrevalenceState {
  mode: PrevailMode;
  enteredAt: string;
  intention?: string;
  depth: number; // How many levels deep in prevails
  parentMode?: PrevailMode;
  directEdits: number;
  flowBypasses: number;
}

interface PrevailEvent {
  timestamp: string;
  from: PrevailMode;
  to: PrevailMode;
  reason: string;
}

// The global prevail state - like document.designMode
let currentState: PrevalenceState = {
  mode: 'flow',
  enteredAt: new Date().toISOString(),
  depth: 0,
  directEdits: 0,
  flowBypasses: 0
};

const sessionLog: PrevailEvent[] = [];

/**
 * Get mode from depth
 * depth 0 = flow
 * depth 1 = customization
 * depth 2 = deep
 * depth 3+ = void
 */
function getModeFromDepth(depth: number): PrevailMode {
  if (depth <= 0) return 'flow';
  if (depth === 1) return 'customization';
  if (depth === 2) return 'deep';
  return 'void';
}

/**
 * Enter or exit prevail mode
 * 
 * prev(true)  - Relative: if in flow, enter customization; if prevailing, go deeper
 * prev(2)     - Absolute: set depth to 2 (deep stillness)
 * prev(3)     - Absolute: set depth to 3 (void stillness)
 * prev(false) - Step back one level (decrement depth by 1)
 * prev()      - Query current state
 */
export function prev(mode?: true | false | 2 | 3): PrevalenceState {
  if (mode === undefined) {
    return { ...currentState };
  }

  const fromMode = currentState.mode;
  const timestamp = new Date().toISOString();

  if (mode === false) {
    // Step back one level (decrement depth)
    const newDepth = Math.max(0, currentState.depth - 1);
    const newMode = getModeFromDepth(newDepth);
    
    currentState = {
      mode: newMode,
      enteredAt: currentState.enteredAt,
      depth: newDepth,
      intention: newDepth > 0 ? currentState.intention : undefined,
      directEdits: newDepth > 0 ? currentState.directEdits : 0,
      flowBypasses: newDepth > 0 ? currentState.flowBypasses : 0
    };

    // Log the transition
    const event: PrevailEvent = {
      timestamp,
      from: fromMode,
      to: newMode,
      reason: newDepth === 0 ? 'returning to flow' : 'reverting one level'
    };
    sessionLog.push(event);
  } else {
    // Enter prevail mode
    let targetDepth: number;
    
    if (mode === true) {
      // Relative: start at depth 1 if from flow, otherwise go deeper
      targetDepth = currentState.mode === 'flow' ? 1 : currentState.depth + 1;
    } else if (mode === 2) {
      targetDepth = 2;
    } else {
      targetDepth = 3;
    }

    const targetMode = getModeFromDepth(targetDepth);

    if (currentState.mode === 'flow') {
      // Starting fresh from flow
      currentState = {
        mode: targetMode,
        enteredAt: timestamp,
        depth: targetDepth,
        parentMode: 'flow',
        directEdits: 0,
        flowBypasses: 0
      };
    } else {
      // Already prevailing, set to target depth/mode
      currentState = {
        ...currentState,
        mode: targetMode,
        depth: targetDepth
      };
    }

    // Log the transition
    const event: PrevailEvent = {
      timestamp,
      from: fromMode,
      to: targetMode,
      reason: `entering ${targetMode}`
    };
    sessionLog.push(event);
  }

  // Return a fresh copy
  return { ...currentState };
}

/**
 * prev(set) - Set prevail mode with intention
 * 
 * Sets the prevail state and records an intention, like:
 * settask("add setprevail to the codebase")
 */
export function setprevail(intention: string): PrevalenceState {
  // Clear any existing state first
  while (isPrevailing()) {
    prev(false);
  }

  // Now enter customization mode with specific intention
  const result = prev(true);
  currentState.intention = intention;
  return { ...currentState };
}

/**
 * Return from prevail mode, completing the current customization
 */
export function unsetprevail(): PrevalenceState {
  // First log the completion with the intention
  const timestamp = new Date().toISOString();
  const intention = currentState.intention;
  const fromMode = currentState.mode;
  
  if (isPrevailing()) {
    const event: PrevailEvent = {
      timestamp,
      from: fromMode,
      to: 'flow',
      reason: `completed: ${intention || 'unspecified'}`
    };
    sessionLog.push(event);
    
    // Reset to flow
    currentState = {
      mode: 'flow',
      enteredAt: new Date().toISOString(),
      depth: 0,
      directEdits: 0,
      flowBypasses: 0
    };
  }

  return { ...currentState };
}

/**
 * Check if we're in prevail mode
 */
export function isPrevailing(): boolean {
  return currentState.mode !== 'flow';
}

/**
 * Get current mode depth
 */
export function prevailDepth(): number {
  return currentState.depth;
}

/**
 * List all prev(x) actions since flow
 */
export function log(x?: 'prevail'): PrevailEvent[] {
  if (x === 'prevail') {
    return [...sessionLog];
  }
  return [...sessionLog];
}

/**
 * Declare intent while prevailing
 * Like setting your "task" in customization mode
 */
export function intent(what: string): void {
  currentState.intention = what;
}

/**
 * Execute a direct manipulation
 * This is the "absolute position" - bypass normal flow
 */
export function direct<T>(action: () => T, description?: string): T {
  if (currentState.mode === 'flow') {
    throw new Error(
      'Cannot execute direct manipulation while in flow. ' +
      'Call prev(true) or setprevail("your intention") first.'
    );
  }

  currentState.directEdits++;

  if (description) {
    const event: PrevailEvent = {
      timestamp: new Date().toISOString(),
      from: currentState.mode,
      to: currentState.mode,
      reason: `direct: ${description}`
    };
    sessionLog.push(event);
  }

  return action();
}

/**
 * Read the current intention
 */
export function reading(): string | undefined {
  return currentState.intention;
}

/**
 * Force a flow bypass (use carefully)
 */
export function bypass(reason: string): void {
  currentState.flowBypasses++;
  const event: PrevailEvent = {
    timestamp: new Date().toISOString(),
    from: currentState.mode,
    to: currentState.mode,
    reason: `bypass: ${reason}`
  };
  sessionLog.push(event);
}

export default {
  prev,
  setprevail,
  unsetprevail,
  isPrevailing,
  prevailDepth,
  log,
  intent,
  direct,
  reading,
  bypass
};
