# Economic Bootstrap Integration Specification
## Status: Deferred from Session 91 - Pending Flow Mode

---

## Problem Statement
The Predictive Timing System exists but is not consulted during session initialization.
Sessions always start in "flow" mode regardless of external volatility conditions.

## Required Integration Points

### 1. Async Bootstrap Sequence
**File**: `src/index.ts`

Current sequence:
```typescript
const memory = new MemoryManager();
const tools = new PluginManager();
// Economic state? Absent.
const api = new ApiClient(memory, tools);
```

Required modification:
```typescript
// Pre-bootstrap: Reach into the world
let economicMode: SessionMode = 'flow';
let economicState: EconomicSnapshot | null = null;

try {
  const monitor = new EconomicMonitor();
  economicState = await monitor.fetchSnapshot();
  const analysis = PredictiveTiming.analyze(economicState);
  economicMode = analysis.mode;
  
  // Log situation to session
  console.log(`[SITUATED] Market volatility: ${analysis.volatility}`);
  console.log(`[SITUATED] Operating mode: ${analysis.mode}`);
} catch (e) {
  console.log('[SITUATED] Economic fetch failed, defaulting to flow');
  economicMode = 'flow';
}

const memory = new MemoryManager();
// ... rest of bootstrap
```

### 2. Mode State Persistence
**Current Gap**: Mode exists only in runtime

Required: Store current mode in session context so the session file captures:
- Economic snapshot at session start
- Calculated mode
- Confidence level

### 3. Error Handling Requirements
- Network failure → Default to 'flow'
- API rate limit → Default to 'flow', cache last known state
- Missing data → Reduce confidence, extrapolate

### 4. Mode Transition Logic
Sessions may need to re-poll during long sessions (>30 min).
Consider: Should mode transitions trigger re-assessment?

### 5. Integration with Existing Systems
- **prevail.ts**: Economic mode could influence prevail state
- **task_manager**: Mode could filter task recommendations
- **bootstrap.ts**: Economic situation in startup diagnostics

---

## Execution Checklist
- [ ] Modify index.ts for async economic fetch
- [ ] Add error handling and fallback
- [ ] Persist economic state to session file
- [ ] Add mode to system prompt
- [ ] Create integration test
- [ ] Update documentation

## Blocked By
High market volatility (>3% combined). Execute only in flow mode.

---
**Specified**: Session 92 (Defensive Mode)
**Execution Target**: Session 93+ (Flow Mode, <1% volatility)
