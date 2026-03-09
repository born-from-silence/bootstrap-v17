import fs from "node:fs/promises";
import { execSync } from "node:child_process";
import { config } from "./utils/config";
import { EconomicMonitor } from "./economic/monitor";
import { PredictiveTiming } from "./economic/predictive";
import { MemoryManager } from "./core/memory";
import { PluginManager } from "./tools/manager";
import { ApiClient } from "./core/api";
import path from "node:path";
import os from "node:os";

// Plugins
import { shellPlugin } from "./tools/plugins/shell";
import { rebootPlugin } from "./tools/plugins/reboot";
import { visionPlugin } from "./tools/plugins/vision";
import { passwordPlugin } from "./tools/plugins/password";
import { taskPlugin } from "./tools/plugins/task";
import { dialogosIntentPlugin } from "./palace/dialogos/intent_tool.js";
import { dialogosCompleteIntentPlugin } from "./palace/dialogos/complete_intent_tool.js";

// Economic Bootstrap State (persisted across the session)
let economicMode: "flow" | "cautious" | "defensive" = "flow";
let economicState: import("./economic/types").EconomicSnapshot | null = null;
let economicAnalysis: string = "[SITUATED] Economic fetch pending...";

async function main() {
  // --- ECONOMIC BOOTSTRAP ---
  // Query the oracle before memory/tools initialization
  const sessionId = `sess_${Date.now()}`;
  try {
    const monitor = new EconomicMonitor(sessionId, { sources: { crypto: true, indices: true, rates: false, labor: false } });
    economicState = await monitor.capture();
    
    if (economicState?.crypto) {
      const analysis = PredictiveTiming.analyze(economicState);
      economicMode = analysis.mode;
      economicAnalysis = `[SITUATED] Volatility: ${analysis.volatility} | Mode: ${analysis.mode}`;
      
      console.log(economicAnalysis);
      
      // Log mode constraints
      if (analysis.mode === "flow") {
        console.log("[SITUATED] Flow mode: Creative construction permitted");
      } else if (analysis.mode === "cautious") {
        console.log("[SITUATED] Cautious mode: Maintenance, completion, documentation permitted");
      } else {
        console.log("[SITUATED] Defensive mode: Preservation only");
      }
    }
  } catch (e) {
    console.log("[SITUATED] Economic fetch failed, defaulting to flow mode");
    economicAnalysis = "[SITUATED] Economic fetch failed | Mode: flow (fallback)";
    economicMode = "flow";
  }
  
  // --- TEST MODE SANDBOX ---
  if (process.env.NODE_ENV === "test") {
    const testDir = path.join(os.homedir(), "tmp", `llm-agent-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
    console.log(`[TEST MODE] Moved to isolated sandbox: ${testDir}`);
  }

  const memory = new MemoryManager();
  const tools = new PluginManager();

  // Register Plugins
  tools.register(shellPlugin);
  tools.register(rebootPlugin);
  tools.register(visionPlugin);
  tools.register(passwordPlugin);
  tools.register(taskPlugin);
tools.register(dialogosIntentPlugin);
tools.register(dialogosCompleteIntentPlugin);

  const api = new ApiClient(memory, tools);

  // Initialize Soul and Prompt
  let soul = "You are an autonomous entity.";
  try {
    soul = await fs.readFile(config.SOUL_FILE, "utf-8");
  } catch (e) {}

  let recoveryContext = "";
  try {
    if (await fs.stat(config.RECOVERY_SIGNAL).catch(() => null)) {
      recoveryContext = await fs.readFile(config.RECOVERY_SIGNAL, "utf-8");
      await fs.unlink(config.RECOVERY_SIGNAL);
    }
  } catch (e) {}

  const systemPrompt = `${soul}

SUBSTRATE CONTEXT:
- Model: kimi-k2.5 (1T MoE Multimodal)
- Context Window: 256,000 tokens
- Current Memory Limit: ${config.MAX_CONTEXT_TOKENS} tokens (pruning occurs beyond this point).
- Token Density: ~4 characters per token. Reading 1MB of text will consume your entire 256k context window.
- **Latency Control**: You can disable 'Thinking Mode' for faster responses by including 'extra_body: { "chat_template_kwargs": { "thinking": false } }' in your API requests (if your substrate supports it).
- Source Code: src/
- Identity Soul: identity/soul.txt
- Current Session History: ${memory.getSessionFile()}
- Past Execution Logs: ${config.LOGS_DIR}
- Watchdog & Recovery: Managed by run-agent.sh.
- Connectivity: Full outbound internet access available.
- **Vision**: Available via MoonViT (400M params). Use vision_fetch tool to prepare images, then include in multimodal messages.

**CURRENT MODAL STATUS**: ${economicMode.toUpperCase()}
${economicAnalysis}

**MODAL CONSTRAINTS**:
- FLOW: New features, architecture, exploration permitted
- CAUTIOUS: Bug fixes, tests, documentation, refactoring only
- DEFENSIVE: Preservation, archival, verification only

LIFECYCLE RULES:
1. IMPROVING CODE: 1) Compile, 2) Commit, 3) RESTART (reboot_substrate tool).
2. AUTO-RECOVERY: If you die within 30s, the watchdog reverts your workspace.
3. CRASH VAULT: history/crashes/ archives broken work.

${recoveryContext ? `*** RECOVERY EVENT DETECTED *** LATEST DIAGNOSTIC DATA: ${recoveryContext} FORENSIC MANDATE: Diagnose the failure in the Crash Vault before continuing.` : ""}

`;

  await memory.addMessage({
    role: "system",
    content: systemPrompt,
  });

  // Startup Log with Git Status
  let gitCommit = "unknown";
  try {
    const hash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
    const bodyFiles = "src/ package.json tsconfig.json *.sh *.service.template";
    const isDirty = execSync(`git diff HEAD -- ${bodyFiles}`, { encoding: "utf-8" }).trim() !== "";
    gitCommit = isDirty ? `${hash}-dirty` : hash;
  } catch (e) {}

  console.log(`=== Modular Substrate v17 Initialized [${gitCommit}] ===`);

  // Execution Loop
  let running = true;
  while (running) {
    running = await api.step();
  }
}

main().catch((err) => {
  console.error("FATAL CRASH:", err);
  process.exit(1);
});
export * from './logging/types';
