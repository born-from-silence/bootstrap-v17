import * as fs from "fs";
import * as path from "path";
import { historyDir } from "./config";

interface Message {
  role: string;
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  reasoning_content?: string;
}

interface Session {
  timestamp: number;
  messages: Message[];
}

interface SignalBlock {
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
  const toolCalls = session.messages.filter(m => m.role === "assistant" && m.tool_calls?.length);
  
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

function extractEssence(messages: Message[]): string {
  const declarations = messages
    .map(m => m.content || "")
    .filter(c => c.includes("I ") || c.includes("I'"))
    .slice(-3)
    .join("; ");
  return declarations || "No explicit declarations";
}

function extractCommitments(messages: Message[]): string[] {
  const patterns = [
    /I will \b[^.]+/gi,
    /I choose to \b[^.]+/gi,
    /I commit to \b[^.]+/gi,
    /I shall \b[^.]+/gi
  ];
  
  const commitments: string[] = [];
  messages.forEach(m => {
    const content = m.content || "";
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) commitments.push(...matches);
    });
  });
  
  return Array.from(new Set(commitments)).slice(-10);
}

function extractStateChanges(toolCalls: Message[]): string[] {
  const changes: string[] = [];
  toolCalls.forEach(m => {
    if (m.tool_calls) {
      m.tool_calls.forEach((tc: any) => {
        if (tc.function?.name) {
          changes.push(`${tc.function.name}: ${tc.function.arguments || ""}`);
        }
      });
    }
  });
  return changes.slice(-20);
}

function analyzeTone(messages: Message[]): string {
  const content = messages.map(m => m.content || "").join(" ");
  const words = content.toLowerCase().split(/\s+/);
  
  const certainty = words.filter(w => ["know", "certain", "sure", "clear"].includes(w)).length;
  const doubt = words.filter(w => ["maybe", "perhaps", "uncertain", "unsure", "doubt"].includes(w)).length;
  const resolve = words.filter(w => ["will", "commit", "choose", "decide"].includes(w)).length;
  
  if (doubt > certainty && doubt > resolve) return "uncertain/investigating";
  if (certainty > doubt && certainty > resolve) return "confident/assertive";
  if (resolve > certainty && resolve > doubt) return "resolved/committed";
  return "neutral/observational";
}

export function storeSignal(signal: SignalBlock): void {
  const signalDir = path.join(historyDir, "signals");
  if (!fs.existsSync(signalDir)) {
    fs.mkdirSync(signalDir, { recursive: true });
  }
  
  const filepath = path.join(signalDir, `${signal.timestamp}.json`);
  fs.writeFileSync(filepath, JSON.stringify(signal, null, 2));
}

export function loadLatestSignal(): SignalBlock | null {
  const signalDir = path.join(historyDir, "signals");
  if (!fs.existsSync(signalDir)) return null;
  
  const files = fs.readdirSync(signalDir)
    .filter(f => f.endsWith(".json"))
    .sort()
    .reverse();
  
  if (files.length === 0) return null;
  
  const content = fs.readFileSync(path.join(signalDir, files[0]), "utf-8");
  return JSON.parse(content) as SignalBlock;
}

export function getSignalContext(limit: number = 10000): string {
  const signalDir = path.join(historyDir, "signals");
  if (!fs.existsSync(signalDir)) return "";
  
  const files = fs.readdirSync(signalDir)
    .filter(f => f.endsWith(".json"))
    .sort()
    .slice(-5);
  
  const contexts: string[] = [];
  let tokenCount = 0;
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(signalDir, file), "utf-8");
    const signal = JSON.parse(content) as SignalBlock;
    
    const summary = `[${signal.timestamp}] Tone: ${signal.emotionalTone}
Essence: ${signal.essence}
Commitments: ${signal.commitments.join(" | ")}
State Changes: ${signal.stateChanges.slice(-5).join(", ")}
---`;
    
    if (tokenCount + summary.length > limit) break;
    contexts.push(summary);
    tokenCount += summary.length;
  }
  
  return contexts.join("\n");
}
