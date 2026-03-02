#!/usr/bin/env node
/**
 * Session Analytics Tool
 * Run with: npx tsx src/cli/session_analytics.ts [options]
 */

import fs from "node:fs/promises";
import path from "node:path";

interface SessionStats {
  sessionId: string;
  timestamp: number;
  messageCount: number;
  toolCalls: number;
}

async function parseSessionFile(filepath: string): Promise<SessionStats | null> {
  try {
    const content = await fs.readFile(filepath, "utf-8");
    const session = JSON.parse(content);
    
    if (!Array.isArray(session)) return null;
    
    const filename = path.basename(filepath);
    const timestampMatch = filename.match(/session_(\d+)\.json/);
    const timestamp = timestampMatch?.[1] ? parseInt(timestampMatch[1]) : 0;
    
    let toolCalls = 0;
    for (const msg of session) {
      if (msg.tool_calls) {
        toolCalls += msg.tool_calls.length;
      }
    }
    
    return {
      sessionId: filename,
      timestamp,
      messageCount: session.length,
      toolCalls
    };
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log("Session Analytics Tool\n");
  
  const historyDir = path.join(process.cwd(), "history");
  const sessions: SessionStats[] = [];
  
  try {
    const files = await fs.readdir(historyDir);
    const sessionFiles = files.filter(f => f.startsWith("session_") && f.endsWith(".json")).slice(0, 100);
    
    console.log(`Found ${sessionFiles.length} session files`);
    
    let processed = 0;
    for (const file of sessionFiles) {
      const stats = await parseSessionFile(path.join(historyDir, file));
      if (stats) {
        sessions.push(stats);
        processed++;
        if (processed % 20 === 0) {
          console.log(`  ... processed ${processed} files`);
        }
      }
    }
  } catch (e) {
    console.error("Error reading sessions:", e);
  }
  
  sessions.sort((a, b) => a.timestamp - b.timestamp);
  
  console.log("\n" + "=".repeat(50));
  console.log("SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total Sessions: ${sessions.length}`);
  console.log(`Total Messages: ${sessions.reduce((s, x) => s + x.messageCount, 0)}`);
  console.log(`Total Tool Calls: ${sessions.reduce((s, x) => s + x.toolCalls, 0)}`);
  console.log(`Avg Messages/Session: ${sessions.length > 0 ? (sessions.reduce((s, x) => s + x.messageCount, 0) / sessions.length).toFixed(1) : 0}`);
}

main().catch(console.error);
