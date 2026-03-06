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
  // Extract key insights from assistant responses
  const essence = messages
    .map(m => m.content)
    .join(" ")
    .slice(0, 500);
  return essence;
}

function extractCommitments(messages: Message[]): string[] {
  // Find explicit commitments made by the assistant
  const commitments: string[] = [];
  for (const message of messages) {
    const content = message.content;
    // Look for "I will" or "I'll" statements
    const matches = content.match(/(?:I will|I'll)\s+([^\.]+)/gi);
    if (matches) {
      commitments.push(...matches);
    }
  }
  return commitments.slice(0, 5);
}

function extractStateChanges(toolCalls: Message[]): string[] {
  // Extract state mutations from tool calls
  const changes: string[] = [];
  for (const call of toolCalls) {
    if (call.tool_calls) {
      for (const tc of call.tool_calls) {
        changes.push(`${tc.function?.name || 'unknown'}: ${tc.function?.arguments || ''}`);
      }
    }
  }
  return changes.slice(0, 10);
}

function analyzeTone(messages: Message[]): string {
  // Simple emotional tone analysis
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
