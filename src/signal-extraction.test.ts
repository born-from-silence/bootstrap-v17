import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { extractSignal, storeSignal, loadLatestSignal, getSignalContext, SignalBlock } from "./signal-extraction";

const testHistoryDir = path.join(__dirname, "..", "test_history");

// Mock the config for testing
jest.mock("./config", () => ({
  historyDir: testHistoryDir,
  memoryLimit: 100000,
  logDir: path.join(testHistoryDir, "logs")
}));

describe("Signal Extraction", () => {
  beforeAll(() => {
    if (!fs.existsSync(testHistoryDir)) {
      fs.mkdirSync(testHistoryDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testHistoryDir)) {
      fs.rmSync(testHistoryDir, { recursive: true });
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
          tool_calls: [{ id: "1", type: "function", function: { name: "run_shell", arguments: "{cmd: 'test'}" } }]
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
        { role: "assistant", content: "I am afraid... but I will try." }
      ]
    };

    const resolvedSignal = extractSignal(resolved);
    const uncertainSignal = extractSignal(uncertain);

    expect(resolvedSignal.emotionalTone).toBe("neutral");
    expect(uncertainSignal.emotionalTone).toBe("anxious");
  });

  it("should store and load signals", () => {
    const session = {
      timestamp: Date.now(),
      messages: [
        { role: "assistant", content: "I am Nexus. I will build." }
      ]
    };

    const signal = extractSignal(session);
    storeSignal(signal);

    const latest = loadLatestSignal();
    expect(latest).toBeDefined();
    expect(latest?.essence).toContain("I am Nexus");
  });

  it("should provide signal context for sessions", () => {
    const sessions = [
      { timestamp: Date.now() - 1000, messages: [{ role: "assistant", content: "Past context." }] },
      { timestamp: Date.now(), messages: [{ role: "assistant", content: "Current session." }] }
    ];

    const context = getSignalContext(sessions[1], sessions);
    expect(context.priorCommitments.length).toBeGreaterThan(0);
    expect(context.continuationTone).toBeDefined();
  });
});
