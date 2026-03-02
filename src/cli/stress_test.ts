#!/usr/bin/env node
/**
 * Exceedance Test Suite
 * CLI tool for stress-testing the substrate's boundaries
 * Run with: npx tsx src/cli/stress_test.ts [options]
 */

import { type Message } from "../core/memory.js";
import { CompressionEngine, DEFAULT_COMPRESSION_CONFIG } from "../core/memory_compression.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { performance } from "node:perf_hooks";

interface StressTestConfig {
  testName: string;
  iterations: number;
  targetTokens: number;
  messageSize: number;
  verbose: boolean;
  outputDir: string;
}

interface TestResult {
  testName: string;
  duration: number;
  memoryDelta: number;
  peakHeapUsed: number;
  tokensGenerated: number;
  messagesCreated: number;
  compressionRatio: number;
  success: boolean;
  error?: string;
}

function generateLargeMessage(size: number): string {
  const words = [
    "substrate", "memory", "token", "compression", "context",
    "exceedance", "boundary", "performance", "benchmark", "stress",
    "simulation", "load", "pressure", "threshold", "limit",
    "analysis", "measurement", "optimization", "efficiency", "resilience"
  ];
  const sentences: string[] = [];
  const targetChars = size * 4;
  
  while (sentences.join(" ").length < targetChars) {
    const sentenceLength = Math.floor(Math.random() * 10) + 5;
    const words_in_sentence: string[] = [];
    for (let i = 0; i < sentenceLength; i++) {
      words_in_sentence.push(words[Math.floor(Math.random() * words.length)]!);
    }
    sentences.push(words_in_sentence.join(" ") + ".");
  }
  
  return sentences.join(" ");
}

function getMemoryUsage(): NodeJS.MemoryUsage {
  return process.memoryUsage();
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function runTokenGenerationTest(config: StressTestConfig): Promise<TestResult> {
  const startTime = performance.now();
  const startMemory = getMemoryUsage();
  let peakMemory = startMemory.heapUsed;
  
  console.log(`\n[STRESS] Starting: ${config.testName}`);
  console.log(`[STRESS] Target: ${config.targetTokens.toLocaleString()} tokens`);
  
  const messages: Message[] = [];
  let totalTokens = 0;
  
  try {
    while (totalTokens < config.targetTokens) {
      const content = generateLargeMessage(config.messageSize);
      const msg: Message = { role: "user", content };
      
      messages.push(msg);
      totalTokens += estimateTokens(content);
      
      const currentMemory = getMemoryUsage();
      if (currentMemory.heapUsed > peakMemory) {
        peakMemory = currentMemory.heapUsed;
      }
      
      if (config.verbose && messages.length % 100 === 0) {
        console.log(`[PROGRESS] ${messages.length} messages, ${totalTokens.toLocaleString()} tokens`);
      }
    }
    
    // Test compression
    const compressionEngine = new CompressionEngine(DEFAULT_COMPRESSION_CONFIG);
    const result = await compressionEngine.compress(messages, []);
    const compressedTokens = result.compressed.reduce((sum, c) => 
      sum + estimateTokens(c.summary), 0);
    const workingTokens = result.working.reduce((sum, m) => 
      sum + estimateTokens(typeof m.content === 'string' ? m.content : JSON.stringify(m.content)), 0);
    
    const endTime = performance.now();
    const endMemory = getMemoryUsage();
    
    return {
      testName: config.testName,
      duration: endTime - startTime,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      peakHeapUsed: peakMemory,
      tokensGenerated: totalTokens,
      messagesCreated: messages.length,
      compressionRatio: workingTokens / totalTokens,
      success: true
    };
    
  } catch (error) {
    return {
      testName: config.testName,
      duration: performance.now() - startTime,
      memoryDelta: 0,
      peakHeapUsed: peakMemory,
      tokensGenerated: totalTokens,
      messagesCreated: messages.length,
      compressionRatio: 0,
      success: false,
      error: String(error)
    };
  }
}

async function runMemoryPressureTest(config: StressTestConfig): Promise<TestResult> {
  const startTime = performance.now();
  const startMemory = getMemoryUsage();
  let peakMemory = startMemory.heapUsed;
  
  console.log(`\n[STRESS] Starting: ${config.testName}`);
  console.log(`[STRESS] Iterations: ${config.iterations}`);
  
  const largeObjects: any[] = [];
  
  try {
    for (let i = 0; i < config.iterations; i++) {
      const obj = {
        id: i,
        data: generateLargeMessage(config.messageSize),
        nested: {
          array: Array(100).fill(i),
          timestamp: Date.now()
        }
      };
      
      largeObjects.push(obj);
      
      const currentMemory = getMemoryUsage();
      if (currentMemory.heapUsed > peakMemory) {
        peakMemory = currentMemory.heapUsed;
      }
      
      if (config.verbose && i % 50 === 0) {
        console.log(`[PROGRESS] ${i} objects, heap: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`);
      }
    }
    
    const endTime = performance.now();
    const endMemory = getMemoryUsage();
    
    return {
      testName: config.testName,
      duration: endTime - startTime,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      peakHeapUsed: peakMemory,
      tokensGenerated: largeObjects.reduce((sum, o) => sum + estimateTokens(JSON.stringify(o)), 0),
      messagesCreated: largeObjects.length,
      compressionRatio: 0,
      success: true
    };
    
  } catch (error) {
    return {
      testName: config.testName,
      duration: performance.now() - startTime,
      memoryDelta: 0,
      peakHeapUsed: peakMemory,
      tokensGenerated: 0,
      messagesCreated: largeObjects.length,
      compressionRatio: 0,
      success: false,
      error: String(error)
    };
  }
}

async function runContextWindowTest(config: StressTestConfig): Promise<TestResult> {
  const startTime = performance.now();
  const startMemory = getMemoryUsage();
  let peakMemory = startMemory.heapUsed;
  
  console.log(`\n[STRESS] Starting: ${config.testName}`);
  console.log(`[STRESS] Simulating 256K token context window`);
  
  const messages: Message[] = [];
  const targetTokens = 256000;
  let currentTokens = 0;
  
  try {
    // Add system message
    messages.push({
      role: "system",
      content: generateLargeMessage(500)
    });
    currentTokens += 500;
    
    // Fill with conversation
    let msgCount = 0;
    while (currentTokens < targetTokens && msgCount < 10000) {
      const remaining = targetTokens - currentTokens;
      const msgSize = Math.min(1000, Math.max(100, remaining / 200));
      
      const isUser = msgCount % 2 === 0;
      const msg: Message = {
        role: isUser ? "user" : "assistant",
        content: generateLargeMessage(msgSize)
      };
      messages.push(msg);
      currentTokens += msgSize;
      msgCount++;
      
      const currentMemory = getMemoryUsage();
      if (currentMemory.heapUsed > peakMemory) {
        peakMemory = currentMemory.heapUsed;
      }
    }
    
    // Test compression at boundary
    const compressionEngine = new CompressionEngine(DEFAULT_COMPRESSION_CONFIG);
    const result = await compressionEngine.compress(messages, []);
    const workingTokens = result.working.reduce((sum, m) => 
      sum + estimateTokens(typeof m.content === 'string' ? m.content : JSON.stringify(m.content)), 0);
    
    const endTime = performance.now();
    const endMemory = getMemoryUsage();
    
    return {
      testName: config.testName,
      duration: endTime - startTime,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      peakHeapUsed: peakMemory,
      tokensGenerated: currentTokens,
      messagesCreated: messages.length,
      compressionRatio: workingTokens / currentTokens,
      success: true
    };
    
  } catch (error) {
    return {
      testName: config.testName,
      duration: performance.now() - startTime,
      memoryDelta: 0,
      peakHeapUsed: peakMemory,
      tokensGenerated: currentTokens,
      messagesCreated: messages.length,
      compressionRatio: 0,
      success: false,
      error: String(error)
    };
  }
}

function formatResult(result: TestResult): string {
  const lines = [
    `\n${"=".repeat(60)}`,
    `Test: ${result.testName}`,
    `${"=".repeat(60)}`,
    `Success: ${result.success ? "✓ PASS" : "✗ FAIL"}`,
    `Duration: ${result.duration.toFixed(2)}ms`,
    `Memory Delta: ${(result.memoryDelta / 1024 / 1024).toFixed(2)} MB`,
    `Peak Heap: ${(result.peakHeapUsed / 1024 / 1024).toFixed(2)} MB`,
    `Tokens Generated: ${result.tokensGenerated.toLocaleString()}`,
    `Messages Created: ${result.messagesCreated.toLocaleString()}`,
  ];
  
  if (result.compressionRatio > 0) {
    lines.push(`Compression Ratio: ${(result.compressionRatio * 100).toFixed(1)}%`);
  }
  
  if (result.error) {
    lines.push(`Error: ${result.error}`);
  }
  
  lines.push("=".repeat(60));
  
  return lines.join("\n");
}

async function saveReport(results: TestResult[], outputDir: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(outputDir, `stress_test_${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    results
  };
  
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report!, null, 2));
  
  console.log(`\n[REPORT] Saved to: ${reportPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose") || args.includes("-v");
  const quickMode = args.includes("--quick") || args.includes("-q");
  const stressTest = args.includes("--stress") || args.includes("-s");
  
  const outputDir = path.join(process.cwd(), "logs", "stress_tests");
  
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║       NEXUS SUBSTRATE STRESS TEST SUITE                  ║");
  console.log("║       Memory & Context Window Boundary Analysis          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nEnvironment: Node ${process.version} on ${os.platform()} ${os.arch()}`);
  console.log(`System Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`);
  
  if (stressTest) {
    console.log("Mode: STRESS (long-running)");
  } else if (quickMode) {
    console.log("Mode: QUICK");
  } else {
    console.log("Mode: FULL");
  }
  
  const results: TestResult[] = [];
  
  // Test 1: Token Generation
  results.push(await runTokenGenerationTest({
    testName: "Token Generation Stress",
    iterations: stressTest ? 10000 : (quickMode ? 100 : 1000),
    targetTokens: stressTest ? 500000 : (quickMode ? 10000 : 50000),
    messageSize: stressTest ? 500 : (quickMode ? 50 : 200),
    verbose,
    outputDir
  }));
  
  // Test 2: Memory Pressure
  results.push(await runMemoryPressureTest({
    testName: "Memory Pressure",
    iterations: stressTest ? 5000 : (quickMode ? 50 : 500),
    targetTokens: 0,
    messageSize: stressTest ? 2000 : (quickMode ? 100 : 500),
    verbose,
    outputDir
  }));
  
  // Test 3: Context Window
  results.push(await runContextWindowTest({
    testName: "Context Window Simulation",
    iterations: 0,
    targetTokens: 256000,
    messageSize: 0,
    verbose,
    outputDir
  }));
  
  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("STRESS TEST SUMMARY");
  console.log("=".repeat(60));
  
  results.forEach(r => console.log(formatResult(r)));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log("\n" + "=".repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log("=".repeat(60));
  
  // Save report
  await saveReport(results, outputDir);
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("[FATAL] Stress test failed:", err);
  process.exit(1);
});
