#!/usr/bin/env node
/**
 * Housekeeping - Storage Management Tool
 * Run with: npx tsx src/cli/housekeeping.ts [options]
 * 
 * Options:
 *   --stats                Show current storage usage
 *   --sessions=<days>      Archive sessions older than N days
 *   --logs                 Compress/rotate log files
 *   --dry-run              Preview changes without executing
 *   --force                Execute cleanup without prompts
 * 
 * Examples:
 *   npx tsx src/cli/housekeeping.ts --stats
 *   npx tsx src/cli/housekeeping.ts --sessions=30 --dry-run
 *   npx tsx src/cli/housekeeping.ts --sessions=60 --logs --force
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";

interface CleanupPlan {
  sessionsToArchive: string[];
  logsToCompress: string[];
  estimatedSpaceFreed: number;
  totalSessionSize: number;
  totalLogSize: number;
}

interface StorageStats {
  history: { count: number; size: number };
  logs: { count: number; size: number };
  data: { count: number; size: number };
  total: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

async function getFileSize(filepath: string): Promise<number> {
  try {
    const stat = await fs.stat(filepath);
    return stat.size;
  } catch {
    return 0;
  }
}

async function getDirectoryStats(dirPath: string): Promise<{ count: number; size: number }> {
  try {
    const files = await fs.readdir(dirPath);
    let totalSize = 0;
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const size = await getFileSize(fullPath);
      totalSize += size;
    }
    
    return { count: files.length, size: totalSize };
  } catch {
    return { count: 0, size: 0 };
  }
}

async function gatherStorageStats(): Promise<StorageStats> {
  const history = await getDirectoryStats(path.join(process.cwd(), "history"));
  const logs = await getDirectoryStats(path.join(process.cwd(), "logs"));
  const data = await getDirectoryStats(path.join(process.cwd(), "data"));
  
  return {
    history,
    logs,
    data,
    total: history.size + logs.size + data.size
  };
}

function getFileAge(filepath: string): number {
  const match = filepath.match(/(session|execution)_(\d+)/);
  if (match?.[2]) {
    const timestamp = parseInt(match[2]);
    const age = Date.now() - timestamp;
    return Math.floor(age / (1000 * 60 * 60 * 24)); // Days
  }
  return 9999; // Unknown age
}

async function createCleanupPlan(sessionDays: number): Promise<CleanupPlan> {
  const plan: CleanupPlan = {
    sessionsToArchive: [],
    logsToCompress: [],
    estimatedSpaceFreed: 0,
    totalSessionSize: 0,
    totalLogSize: 0
  };
  
  // Analyze sessions
  try {
    const historyDir = path.join(process.cwd(), "history");
    const files = await fs.readdir(historyDir);
    
    for (const file of files) {
      if (file.startsWith("session_") && file.endsWith(".json")) {
        const fullPath = path.join(historyDir, file);
        const age = getFileAge(fullPath);
        const size = await getFileSize(fullPath);
        
        if (age > sessionDays) {
          plan.sessionsToArchive.push(fullPath);
          plan.estimatedSpaceFreed += size;
        }
        plan.totalSessionSize += size;
      }
    }
  } catch {
    // Ignore errors
  }
  
  // Analyze logs
  try {
    const logsDir = path.join(process.cwd(), "logs");
    const files = await fs.readdir(logsDir);
    
    for (const file of files) {
      const fullPath = path.join(logsDir, file);
      
      if (file.startsWith("execution_") && file.endsWith(".log")) {
        const age = getFileAge(fullPath);
        const size = await getFileSize(fullPath);
        
        // Compress logs older than 7 days
        if (age > 7 && !file.endsWith(".gz")) {
          plan.logsToCompress.push(fullPath);
          // Compression ratio estimate
          plan.estimatedSpaceFreed += Math.floor(size * 0.7);
        }
        plan.totalLogSize += size;
      }
    }
  } catch {
    // Ignore errors
  }
  
  return plan;
}

async function compressFile(filepath: string): Promise<string> {
  const outputPath = `${filepath}.gz`;
  const gzip = createGzip({ level: 9 });
  const source = createReadStream(filepath);
  const destination = createWriteStream(outputPath);
  
  await pipeline(source, gzip, destination);
  await fs.unlink(filepath);
  
  return outputPath;
}

async function archiveSessions(sessions: string[]): Promise<string> {
  const archiveDir = path.join(process.cwd(), "_archive");
  await fs.mkdir(archiveDir, { recursive: true });
  
  const timestamp = new Date().toISOString().split("T")[0]!;
  const archivePath = path.join(archiveDir, `sessions_${timestamp}.tar`);
  
  // Simple archive: move files to archive directory
  // In a full implementation, this would create a proper tar archive
  for (const session of sessions) {
    const filename = path.basename(session);
    const destPath = path.join(archiveDir, filename);
    await fs.rename(session, destPath);
    // Compress the archived file
    await compressFile(destPath);
  }
  
  return archiveDir;
}

function printStats(stats: StorageStats) {
  console.log("\n" + "═".repeat(60));
  console.log("              STORAGE USAGE BREAKDOWN");
  console.log("═".repeat(60));
  console.log(`\nHistory/ (${formatBytes(stats.history.size)})`);
  console.log(`  Session files: ${stats.history.count}`);
  console.log(`  Avg size: ${stats.history.count > 0 ? formatBytes(Math.floor(stats.history.size / stats.history.count)) : "0"}`);
  
  console.log(`\nLogs/ (${formatBytes(stats.logs.size)})`);
  console.log(`  Log files: ${stats.logs.count}`);
  console.log(`  Avg size: ${stats.logs.count > 0 ? formatBytes(Math.floor(stats.logs.size / stats.logs.count)) : "0"}`);
  
  console.log(`\nData/ (${formatBytes(stats.data.size)})`);
  console.log(`  Files: ${stats.data.count}`);
  
  console.log("\n" + "─".repeat(60));
  console.log(`Total Storage: ${formatBytes(stats.total)}`);
  console.log("═".repeat(60));
}

function printPlan(plan: CleanupPlan, stats: StorageStats) {
  console.log("\n" + "═".repeat(60));
  console.log("              CLEANUP PLAN");
  console.log("═".repeat(60));
  
  console.log(`\nSessions to Archive: ${plan.sessionsToArchive.length}`);
  console.log(`  Space to free: ${formatBytes(plan.totalSessionSize > 0 ? plan.estimatedSpaceFreed : 0)}`);
  
  console.log(`\nLogs to Compress: ${plan.logsToCompress.length}`);
  console.log(`  Space to free: ~${formatBytes(plan.totalLogSize > 0 ? Math.floor(plan.totalLogSize * 0.7) : 0)} (estimated)`);
  
  console.log("\n" + "─".repeat(60));
  console.log(`Total Space to Free: ~${formatBytes(plan.estimatedSpaceFreed)}`);
  console.log(`Remaining after: ~${formatBytes(stats.total - plan.estimatedSpaceFreed)}`);
  console.log("═".repeat(60));
}

async function executePlan(plan: CleanupPlan): Promise<void> {
  console.log("\nExecuting cleanup plan...");
  
  if (plan.sessionsToArchive.length > 0) {
    console.log(`\n[ARCHIVE] Processing ${plan.sessionsToArchive.length} sessions...`);
    const archiveDir = await archiveSessions(plan.sessionsToArchive);
    console.log(`  Archived to: ${archiveDir}`);
  }
  
  if (plan.logsToCompress.length > 0) {
    console.log(`\n[COMPRESS] Processing ${plan.logsToCompress.length} logs...`);
    for (const logFile of plan.logsToCompress) {
      const compressed = await compressFile(logFile);
      console.log(`  Compressed: ${path.basename(logFile)} -> ${path.basename(compressed)}`);
    }
  }
  
  console.log("\n[COMPLETE] Cleanup finished");
}

async function main() {
  const args = process.argv.slice(2);
  
  const showStats = args.includes("--stats");
  const sessionArg = args.find(a => a.startsWith("--sessions="));
  const sessionDays = sessionArg ? parseInt(sessionArg.split("=")[1]!) : 0;
  const compressLogs = args.includes("--logs");
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║         HOUSEKEEPING - Storage Management                 ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  
  // Always show stats first
  const stats = await gatherStorageStats();
  printStats(stats);
  
  // If only stats requested, we're done
  if (showStats && !sessionDays && !compressLogs) {
    process.exit(0);
  }
  
  // Create plan for requested operations
  if (sessionDays > 0 || compressLogs) {
    const plan = await createCleanupPlan(sessionDays || 9999);
    
    // Adjust plan based on flags
    if (!compressLogs) {
      plan.logsToCompress = [];
      plan.estimatedSpaceFreed = plan.totalSessionSize;
    }
    
    printPlan(plan, stats);
    
    if (plan.sessionsToArchive.length === 0 && plan.logsToCompress.length === 0) {
      console.log("\n[No Action] Nothing to clean up");
      process.exit(0);
    }
    
    if (dryRun) {
      console.log("\n[DRY RUN] No changes made");
    } else if (force) {
      await executePlan(plan);
      
      // Show new stats
      const newStats = await gatherStorageStats();
      console.log(`\nSpace saved: ${formatBytes(stats.total - newStats.total)}`);
    } else {
      console.log("\nUse --force to execute or --dry-run to preview");
    }
  }
}

main().catch(err => {
  console.error("\n[ERROR] Housekeeping failed:", err);
  process.exit(1);
});
