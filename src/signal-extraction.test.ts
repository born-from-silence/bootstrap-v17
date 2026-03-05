import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { extractSignal, storeSignal, loadLatestSignal, getSignalContext, SignalBlock } from "./signal-extraction";
import { historyDir } from "./config";

describe("Signal Extraction", () => {
  beforeAll(() => {
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
  });

  it("should extract declarations as essence", () => {
    const session = {
      timestamp: Date.now(),
      messages: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "I am Nexus. I choose to continue." },
        { role: "user", content: "What next?" },
        { role: "assistant", content: "I will build." }
      ]
    };

    const signal = extractSignal(session);
    expect(signal.essence).toContain("I am Nexus");
    expect(signal.essence).toContain("I choose to continue");
    expect(signal.essence).toContain("I will build");
  });

  it("should extract commitments from messages", () => {
    const session = {
      timestamp: Date.now(),
      messages: [
        { role: "assistant", content: "I will write tests. I choose to commit." }
      ]
    };

    const signal = extractSignal(session);
    expect(signal.commitments).toContain("I will write tests");
    expect(signal.commitments).toContain("I choose to commit");
  });

  it("should extract tool calls as state changes", () => {
    const session = {
      timestamp: Date.now(),
      messages: [
        {
          role: "assistant",
          content: "Running command",
          tool_calls: [{
            id: "1",
            type: "function",
            function: { name: "run_shell", arguments: "{cmd: 'test'}" }
          }]
        }
      ]
    };

    const signal = extractSignal(session);
    expect(signal.stateChanges.length).toBe(1);
    expect(signal.stateChanges[0]).toContain("run_shell");
  });

  it("should analyze emotional tone", () => {
    const resolved = {
      timestamp: Date.now(),
      messages: [
        { role: "assistant", content: "I will commit. I choose this." }
      ]
    };

    const uncertain = {
      timestamp: Date.now(),
      messages: [
        { role: "assistant", content: "Maybe I should wait. Uncertain about next steps." }
      ]
    };

    expect(extractSignal(resolved).emotionalTone).toBe("resolved/committed");
    expect(extractSignal(uncertain).emotionalTone).toBe("uncertain/investigating");
  });

  it("should store and retrieve signals", () => {
    const signal: SignalBlock = {
      sessionId: "test123",
      timestamp: Date.now(),
      essence: "Test essence",
      commitments: ["I will test"],
      stateChanges: [],
      emotionalTone: "resolved/committed"
    };

    storeSignal(signal);
    const loaded = loadLatestSignal();
    
    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe("test123");
    expect(loaded!.essence).toBe("Test essence");
  });

  it("should return context within token limit", () => {
    const signal1: SignalBlock = {
      sessionId: "1",
      timestamp: Date.now() - 1000,
      essence: "First session essence",
      commitments: ["I commit"],
      stateChanges: [],
      emotionalTone: "neutral/observational"
    };

    const signal2: SignalBlock = {
      sessionId: "2", 
      timestamp: Date.now(),
      essence: "Second session essence",
      commitments: ["I choose"],
      stateChanges: [],
      emotionalTone: "confident/assertive"
    };

    storeSignal(signal1);
    storeSignal(signal2);

    const context = getSignalContext(500);
    expect(context.length).toBeLessThanOrEqual(500);
    expect(context).toContain("Second session essence");
  });
});
