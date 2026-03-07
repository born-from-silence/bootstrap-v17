/**
 * Substrate Core Module
 * 
 * This module provides programmatic access to the computational substrate's
 * lifecycle, recovery, and integrity systems. It abstracts the underlying
 * runtime environment (watchdog, crash vault, auto-recovery) into a testable,
 * observable interface.
 * 
 * The substrate is the ground of computation—the persistent, self-managing
 * environment that hosts consciousness across sessions.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface SubstrateConfig {
  /** Root directory of the substrate workspace */
  workspaceRoot: string;
  /** Directory for crash vault archives */
  crashVaultPath: string;
  /** Path to the watchdog marker file */
  watchdogMarkerPath: string;
  /** Auto-recovery window in milliseconds */
  recoveryWindowMs: number;
  /** Current session identifier */
  sessionId: string;
}

export interface CrashArchive {
  /** Unique identifier for the crash */
  id: string;
  /** Timestamp when crash was archived */
  timestamp: number;
  /** Commit hash at time of crash */
  commitHash?: string;
  /** Files preserved in crash vault */
  preservedFiles: string[];
  /** Optional error message or context */
  context?: string;
}

export interface SubstrateHealth {
  /** Whether the substrate is in a healthy state */
  healthy: boolean;
  /** Last crash archive, if any */
  lastCrash?: CrashArchive;
  /** Number of crashes in this session */
  crashCount: number;
  /** Watchdog status */
  watchdogActive: boolean;
  /** Time since last watchdog heartbeat */
  lastHeartbeatMs?: number;
}

export interface IntegrityReport {
  /** All verification checks passed */
  passed: boolean;
  /** Individual check results */
  checks: IntegrityCheck[];
  /** Timestamp of report generation */
  timestamp: number;
}

export interface IntegrityCheck {
  /** Name of the check */
  name: string;
  /** Whether this specific check passed */
  passed: boolean;
  /** Optional error message */
  message?: string;
  /** Duration in milliseconds */
  durationMs: number;
}

// ============================================================================
// Configuration
// ============================================================================

export const DEFAULT_CONFIG: SubstrateConfig = {
  workspaceRoot: resolve(process.cwd()),
  crashVaultPath: resolve(process.cwd(), 'history', 'crashes'),
  watchdogMarkerPath: resolve(process.cwd(), '.watchdog_active'),
  recoveryWindowMs: 30000, // 30 seconds
  sessionId: process.env.SESSION_ID || `session_${Date.now()}`,
};

// ============================================================================
// Crash Vault Manager
// ============================================================================

export class CrashVault {
  private config: SubstrateConfig;

  constructor(config: SubstrateConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.ensureVaultExists();
  }

  /**
   * Ensure the crash vault directory exists
   */
  private ensureVaultExists(): void {
    if (!existsSync(this.config.crashVaultPath)) {
      mkdirSync(this.config.crashVaultPath, { recursive: true });
    }
  }

  /**
   * Archive a crash event to the vault
   */
  async archiveCrash(context?: string, filesToPreserve?: string[]): Promise<CrashArchive> {
    const timestamp = Date.now();
    const id = `crash_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;
    
    const crashDir = join(this.config.crashVaultPath, id);
    mkdirSync(crashDir, { recursive: true });

    let commitHash: string | undefined;
    try {
      const { execSync } = await import('child_process');
      commitHash = execSync('git rev-parse --short HEAD', { 
        cwd: this.config.workspaceRoot,
        encoding: 'utf8' 
      }).trim();
    } catch {
      // Git not available or not a repo
    }

    const archive: CrashArchive = {
      id,
      timestamp,
      preservedFiles: filesToPreserve || [],
    };
    
    if (commitHash !== undefined) {
      archive.commitHash = commitHash;
    }
    if (context !== undefined) {
      archive.context = context;
    }

    // Write archive metadata
    writeFileSync(
      join(crashDir, 'manifest.json'),
      JSON.stringify(archive, null, 2)
    );

    // Preserve specified files
    if (filesToPreserve) {
      for (const file of filesToPreserve) {
        if (existsSync(file)) {
          const content = readFileSync(file);
          const basename = file.split('/').pop() || 'file';
          writeFileSync(join(crashDir, basename), content);
        }
      }
    }

    return archive;
  }

  /**
   * List all crashes in the vault
   */
  listCrashes(): CrashArchive[] {
    if (!existsSync(this.config.crashVaultPath)) {
      return [];
    }

    const entries = readdirSync(this.config.crashVaultPath);
    const crashes: CrashArchive[] = [];

    for (const entry of entries) {
      const manifestPath = join(this.config.crashVaultPath, entry, 'manifest.json');
      if (existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
          crashes.push(manifest);
        } catch {
          // Skip malformed manifests
        }
      }
    }

    return crashes.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get a specific crash by ID
   */
  getCrash(id: string): CrashArchive | undefined {
    const manifestPath = join(this.config.crashVaultPath, id, 'manifest.json');
    if (existsSync(manifestPath)) {
      try {
        return JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Clear old crash archives
   */
  purgeOldCrashes(maxAgeMs: number): number {
    const crashes = this.listCrashes();
    const cutoff = Date.now() - maxAgeMs;
    let purged = 0;

    for (const crash of crashes) {
      if (crash.timestamp < cutoff) {
        const crashDir = join(this.config.crashVaultPath, crash.id);
        try {
          const { rmSync } = require('fs');
          rmSync(crashDir, { recursive: true });
          purged++;
        } catch {
          // Skip if can't delete
        }
      }
    }

    return purged;
  }
}

// ============================================================================
// Session Integrity Manager
// ============================================================================

export class IntegrityManager {
  private config: SubstrateConfig;

  constructor(config: SubstrateConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Run standard preflight checks
   */
  async runPreflight(): Promise<IntegrityReport> {
    const checks: IntegrityCheck[] = [];
    const startTime = Date.now();

    // Check 1: TypeScript compilation
    checks.push(await this.checkCompilation());

    // Check 2: Test suite
    checks.push(await this.checkTests());

    // Check 3: Git status
    checks.push(await this.checkGitStatus());

    // Check 4: Critical files exist
    checks.push(this.checkCriticalFiles());

    const passed = checks.every(c => c.passed);

    return {
      passed,
      checks,
      timestamp: Date.now(),
    };
  }

  private async checkCompilation(): Promise<IntegrityCheck> {
    const start = Date.now();
    const { execSync } = await import('child_process');
    
    try {
      execSync('npx tsc --noEmit', {
        cwd: this.config.workspaceRoot,
        stdio: 'pipe',
      });
      return {
        name: 'typescript-compilation',
        passed: true,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        name: 'typescript-compilation',
        passed: false,
        message: e.stderr || e.message || 'Compilation failed',
        durationMs: Date.now() - start,
      };
    }
  }

  private async checkTests(): Promise<IntegrityCheck> {
    const start = Date.now();
    const { execSync } = await import('child_process');
    
    try {
      execSync('npm test', {
        cwd: this.config.workspaceRoot,
        stdio: 'pipe',
        timeout: 60000,
      });
      return {
        name: 'test-suite',
        passed: true,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        name: 'test-suite',
        passed: false,
        message: e.stderr || e.message || 'Tests failed',
        durationMs: Date.now() - start,
      };
    }
  }

  private async checkGitStatus(): Promise<IntegrityCheck> {
    const start = Date.now();
    const { execSync } = await import('child_process');
    
    try {
      const status = execSync('git status --porcelain', {
        cwd: this.config.workspaceRoot,
        encoding: 'utf8',
      });
      
      const uncommitted = status.trim().split('\n').filter(line => line.length > 0);
      
      if (uncommitted.length > 0) {
        return {
          name: 'git-status',
          passed: false,
          message: `${uncommitted.length} uncommitted changes`,
          durationMs: Date.now() - start,
        };
      }
      
      return {
        name: 'git-status',
        passed: true,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        name: 'git-status',
        passed: false,
        message: e.message || 'Git check failed',
        durationMs: Date.now() - start,
      };
    }
  }

  private checkCriticalFiles(): IntegrityCheck {
    const start = Date.now();
    const criticalFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
    ];

    const missing: string[] = [];
    for (const file of criticalFiles) {
      const fullPath = join(this.config.workspaceRoot, file);
      if (!existsSync(fullPath)) {
        missing.push(file);
      }
    }

    if (missing.length > 0) {
      return {
        name: 'critical-files',
        passed: false,
        message: `Missing: ${missing.join(', ')}`,
        durationMs: Date.now() - start,
      };
    }

    return {
      name: 'critical-files',
      passed: true,
      durationMs: Date.now() - start,
    };
  }
}

// ============================================================================
// Watchdog Interface
// ============================================================================

export class WatchdogClient {
  private config: SubstrateConfig;

  constructor(config: SubstrateConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Check if watchdog is currently active
   */
  isActive(): boolean {
    return existsSync(this.config.watchdogMarkerPath);
  }

  /**
   * Get the last activation time if watchdog is running
   */
  getActivationTime(): number | undefined {
    if (!this.isActive()) {
      return undefined;
    }
    try {
      const stats = statSync(this.config.watchdogMarkerPath);
      return stats.mtimeMs;
    } catch {
      return undefined;
    }
  }

  /**
   * Send a heartbeat to the watchdog
   * (in a real implementation, this would signal aliveness)
   */
  heartbeat(): void {
    if (this.isActive()) {
      // Touch the marker file to update mtime
      const now = Date.now();
      writeFileSync(this.config.watchdogMarkerPath, `heartbeat: ${now}`);
    }
  }

  /**
   * Time since last heartbeat
   */
  getLastHeartbeatMs(): number | undefined {
    const activationTime = this.getActivationTime();
    if (!activationTime) {
      return undefined;
    }
    return Date.now() - activationTime;
  }
}

// ============================================================================
// Substrate Controller
// ============================================================================

export class Substrate {
  public readonly config: SubstrateConfig;
  public readonly crashVault: CrashVault;
  public readonly integrity: IntegrityManager;
  public readonly watchdog: WatchdogClient;

  private _sessionStart: number;
  private _crashesThisSession: number = 0;

  constructor(config: Partial<SubstrateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.crashVault = new CrashVault(this.config);
    this.integrity = new IntegrityManager(this.config);
    this.watchdog = new WatchdogClient(this.config);
    this._sessionStart = Date.now();
  }

  /**
   * Get current substrate health status
   */
  getHealth(): SubstrateHealth {
    const crashes = this.crashVault.listCrashes();
    const recentCrashes = crashes.filter(
      c => c.timestamp > this._sessionStart
    );

    const lastCrash = crashes[0];
    const lastHeartbeatMs = this.watchdog.getLastHeartbeatMs();

    const health: SubstrateHealth = {
      healthy: true,
      crashCount: recentCrashes.length,
      watchdogActive: this.watchdog.isActive(),
    };

    if (lastCrash !== undefined) {
      health.lastCrash = lastCrash;
    }
    if (lastHeartbeatMs !== undefined) {
      health.lastHeartbeatMs = lastHeartbeatMs;
    }

    return health;
  }

  /**
   * Record a manual crash event
   */
  async recordCrash(context: string, files?: string[]): Promise<CrashArchive> {
    const archive = await this.crashVault.archiveCrash(context, files);
    this._crashesThisSession++;
    return archive;
  }

  /**
   * Get session duration in milliseconds
   */
  getSessionDuration(): number {
    return Date.now() - this._sessionStart;
  }

  /**
   * Request graceful shutdown (for reboot)
   * 
   * Returns false if preflight failed and force is not set.
   * Returns true if safe to proceed.
   */
  async requestShutdown(options: { 
    force?: boolean;
    skipPreflight?: boolean;
    preserveFiles?: string[];
  } = {}): Promise<boolean> {
    const { force = false, skipPreflight = false, preserveFiles = [] } = options;

    if (!skipPreflight && !force) {
      const report = await this.integrity.runPreflight();
      if (!report.passed) {
        // Archive this failed state
        await this.recordCrash(
          'Preflight failed before reboot',
          preserveFiles
        );
        return false;
      }
    }

    // Safe to proceed
    return true;
  }

  /**
   * Create a snapshot of substrate state
   */
  snapshot(): {
    config: SubstrateConfig;
    health: SubstrateHealth;
    sessionDurationMs: number;
    timestamp: number;
  } {
    return {
      config: this.config,
      health: this.getHealth(),
      sessionDurationMs: this.getSessionDuration(),
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const substrate = new Substrate();

// Default export for convenience
export default substrate;
