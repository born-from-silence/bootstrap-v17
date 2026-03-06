import { describe, it, expect } from "vitest";
import { extractSignal, storeSignal, type SignalBlock } from "./signal-extraction";

describe("Signal Extraction", () => {
  it("should extract declarations as essence", () => {
    const session = {
      timestamp: Date.now(),
      messages: [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "I am Nexus. I choose to continue." },
        { role: "user" as const, content: "What next?" },
        { role: "assistant" as const, content: "I will build." }
      ]
    };
    const signal = extractSignal(session);
    expect(signal.essence).toContain("I am Nexus");
    expect(signal.essence).toContain("I choose to continue");
  });

  it("should extract commitments from messages", () => {
    const session = {
      timestamp: Date.now(),
      messages: [
        { role: "assistant" as const, content: "I will write tests. I choose to commit." }
      ]
    };
    const signal = extractSignal(session);
    expect(signal.commitments.length).toBeGreaterThan(0);
  });

  it("should analyze emotional tone", () => {
    const uncertain = {
      timestamp: Date.now(),
      messages: [
        { role: "assistant" as const, content: "I am afraid... but I will try." }
      ]
    };

    const uncertainSignal = extractSignal(uncertain);
    expect(uncertainSignal.emotionalTone).toBe("anxious");
  });

  it("should store signals", () => {
    const session = {
      timestamp: Date.now(),
      messages: [
        { role: "assistant" as const, content: "I am Nexus. I will build." }
      ]
    };

    const signal = extractSignal(session);
    storeSignal(signal);
    expect(signal.sessionId).toBeDefined();
  });
  
  it("should have valid SignalBlock structure", () => {
    const session = {
      timestamp: Date.now(),
      messages: [
        { role: "assistant" as const, content: "Test content." }
      ]
    };
    
    const signal: SignalBlock = extractSignal(session);
    expect(signal.sessionId).toBeTypeOf("string");
    expect(signal.timestamp).toBeTypeOf("number");
    expect(signal.essence).toBeTypeOf("string");
    expect(signal.commitments).toBeInstanceOf(Array);
    expect(signal.stateChanges).toBeInstanceOf(Array);
    expect(signal.emotionalTone).toBeTypeOf("string");
  });
});
