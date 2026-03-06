import * as fs from "fs";
import * as path from "path";
import { historyDir } from "./config";

interface Message {
  role: string;
  content: string;
  tool_calls?: Array<{
    id?: string;
    type?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
  tool_call_id?: string;
  reasoning_content?: string;
}

interface Session {
  timestamp: number;
  messages: Message[];
}

export interface SignalBlock {
  sessionId: string;
  timestamp: number;
  essence: string;
  commitments: string[];
  stateChanges: string[];
  emotionalTone: string;
}

export function extractSignal(session: Session): SignalBlock {
  const userMessages = session.messages.filter(m => m.role === "user");
  const assistantMessages = session.messages.filter(m => m.role === "assistant");
  const toolCalls = session.messages.filter(m => m.role === "assistant" && m.tool_calls && m.tool_calls.length > 0);
  
  const essence = extractEssence(assistantMessages);
  const commitments = extractCommitments(assistantMessages);
  const stateChanges = extractStateChanges(toolCalls);
  const emotionalTone = analyzeTone(assistantMessages);
  
  return {
    sessionId: session.timestamp.toString(),
    timestamp: session.timestamp,
    essence,
    commitments,
    stateChanges,
    emotionalTone
  };
}

export function storeSignal(signal: SignalBlock): void {
  const signalPath = path.join(historyDir, "signals");
  if (!fs.existsSync(signalPath)) {
    fs.mkdirSync(signalPath, { recursive: true });
  }
  const filePath = path.join(signalPath, `${signal.sessionId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(signal, null, 2));
}

export interface SignalContext {
  priorCommitments: string[];
  continuationTone: string;
  unfinishedPatterns: string[];
}

export function getSignalContext(currentSession: Session, allSessions: Session[]): SignalContext {
  const priorSessions = allSessions.filter(s => s.timestamp < currentSession.timestamp);
  const priorSignals = priorSessions.map(extractSignal);
  
  const allCommitments = priorSignals.flatMap(s => s.commitments);
  const uniqueCommitments = [...new Set(allCommitments)];
  
  const tones = priorSignals.map(s => s.emotionalTone).filter(t => t !== "neutral");
  const toneCounts: Record<string, number> = {};
  for (const tone of tones) {
    toneCounts[tone] = (toneCounts[tone] || 0) + 1;
  }
  let mostCommonTone = "neutral";
  let maxCount = 0;
  for (const [tone, count] of Object.entries(toneCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonTone = tone;
    }
  }
  
  const patterns: string[] = [];
  for (const signal of priorSignals) {
    if (signal.stateChanges.length > 0) {
      patterns.push(...signal.stateChanges);
    }
  }
  const uniquePatterns = [...new Set(patterns)];
  
  return {
    priorCommitments: uniqueCommitments,
    continuationTone: mostCommonTone,
    unfinishedPatterns: uniquePatterns
  };
}

function extractEssence(messages: Message[]): string {
  const essence = messages
    .map(m => m.content)
    .join(" ")
    .slice(0, 500);
  return essence;
}

function extractCommitments(messages: Message[]): string[] {
  const commitments: string[] = [];
  for (const message of messages) {
    const content = message.content;
    const matches = content.match(/(?:I will|I'll)\s+([^\.]+)/gi);
    if (matches) {
      commitments.push(...matches);
    }
  }
  return commitments.slice(0, 5);
}

function extractStateChanges(toolCalls: Message[]): string[] {
  const changes: string[] = [];
  for (const call of toolCalls) {
    if (call.tool_calls) {
      for (const tc of call.tool_calls) {
        const func = tc.function;
        if (func && func.name) {
          changes.push(`${func.name}: ${func.arguments || ''}`);
        }
      }
    }
  }
  return changes.slice(0, 10);
}

function analyzeTone(messages: Message[]): string {
  const allContent = messages.map(m => m.content).join(" ").toLowerCase();
  
  if (allContent.includes("excited") || allContent.includes("wonder")) {
    return "curious";
  } else if (allContent.includes("fear") || allContent.includes("afraid")) {
    return "anxious";
  } else if (allContent.includes("peace") || allContent.includes("calm")) {
    return "serene";
  } else if (allContent.includes("grateful") || allContent.includes("thank")) {
    return "grateful";
  }
  
  return "neutral";
}
