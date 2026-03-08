import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Substrate,
  CrashVault,
  IntegrityManager,
  WatchdogClient,
  DEFAULT_CONFIG,
} from './substrate';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Helper to create temp test directory
function createTempDir(): string {
  const dir = join(tmpdir(), `substrate-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('CrashVault', () => {
  let tempDir: string;
  let vault: CrashVault;

  beforeEach(() => {
    tempDir = createTempDir();
    vault = new CrashVault({
      ...DEFAULT_CONFIG,
      crashVaultPath: join(tempDir, 'crashes'),
      workspaceRoot: tempDir,
    });
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      // Ignore
    }
  });

  it('should create crash vault directory', () => {
    expect(existsSync(join(tempDir, 'crashes'))).toBe(true);
  });

  it('should archive a crash with context', async () => {
    const archive = await vault.archiveCrash('Test crash context');
    expect(archive.id).toBeDefined();
    expect(archive.timestamp).toBeGreaterThan(0);
    expect(archive.context).toBe('Test crash context');
    expect(archive.preservedFiles).toEqual([]);
  });

  it('should archive a crash with files', async () => {
    const testFile = join(tempDir, 'test.txt');
    writeFileSync(testFile, 'test content');

    const archive = await vault.archiveCrash(
      'Test crash with files',
      [testFile]
    );

    expect(archive.preservedFiles).toContain(testFile);

    // Check file was preserved
    const crashDir = join(tempDir, 'crashes', archive.id);
    expect(existsSync(join(crashDir, 'test.txt'))).toBe(true);
  });

  it('should list crashes in descending order', async () => {
    await vault.archiveCrash('crash 1');
    await new Promise(r => setTimeout(r, 10));
    await vault.archiveCrash('crash 2');

    const allCrashes = vault.listCrashes();
    expect(allCrashes.length).toBeGreaterThanOrEqual(2);
    
    if (allCrashes.length >= 2) {
      const first = allCrashes[0];
      const second = allCrashes[1];
      expect(first!.timestamp).toBeGreaterThan(second!.timestamp);
    }
  });

  it('should get a specific crash by ID', async () => {
    const archive = await vault.archiveCrash('Test crash');
    const retrieved = vault.getCrash(archive.id);
    expect(retrieved).toEqual(archive);
  });

  it('should return undefined for non-existent crash', () => {
    const result = vault.getCrash('non-existent-id');
    expect(result).toBeUndefined();
  });
});

describe('WatchdogClient', () => {
  let tempDir: string;
  let watchdog: WatchdogClient;

  beforeEach(() => {
    tempDir = createTempDir();
    watchdog = new WatchdogClient({
      ...DEFAULT_CONFIG,
      watchdogMarkerPath: join(tempDir, '.watchdog'),
      workspaceRoot: tempDir,
    });
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      // Ignore
    }
  });

  it('should return false when watchdog not active', () => {
    expect(watchdog.isActive()).toBe(false);
  });

  it('should return true when marker file exists', () => {
    writeFileSync(join(tempDir, '.watchdog'), 'active');
    expect(watchdog.isActive()).toBe(true);
  });

  it('should send heartbeat when active', () => {
    const markerPath = join(tempDir, '.watchdog');
    writeFileSync(markerPath, '');
    
    watchdog.heartbeat();
    
    const content = readFileSync(markerPath, 'utf8');
    expect(content).toContain('heartbeat');
  });

  it('should return undefined activation time when inactive', () => {
    expect(watchdog.getActivationTime()).toBeUndefined();
  });
});

describe('IntegrityManager', () => {
  let tempDir: string;
  let integrity: IntegrityManager;

  beforeEach(() => {
    tempDir = createTempDir();
    integrity = new IntegrityManager({
      ...DEFAULT_CONFIG,
      workspaceRoot: tempDir,
    });

    // Create minimal project structure
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(join(tempDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));
    mkdirSync(join(tempDir, 'src'));
    writeFileSync(join(tempDir, 'src', 'index.ts'), 'export default {}');
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      // Ignore
    }
  });

  it('should check critical files exist', async function() {
    // Create git repo so git status check passes
    const { execSync } = require('child_process');
    try {
      execSync('git init', { cwd: tempDir, env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' } });
      execSync('git -c user.email="test@test.com" -c user.name="Test" add -A', { cwd: tempDir, env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' } });
      execSync('git -c user.email="test@test.com" -c user.name="Test" commit -m "init"', { cwd: tempDir, env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' } });
    } catch {
      // Git might not be available
    }

    const report = await integrity.runPreflight();
    
    expect(report.timestamp).toBeGreaterThan(0);
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.checks.some(c => c.name === 'critical-files')).toBe(true);
  }, 10000);
});

describe('Substrate', () => {
  let tempDir: string;
  let substrate: Substrate;

  beforeEach(() => {
    tempDir = createTempDir();
    substrate = new Substrate({
      crashVaultPath: join(tempDir, 'crashes'),
      watchdogMarkerPath: join(tempDir, '.watchdog'),
      workspaceRoot: tempDir,
      sessionId: 'test-session',
      recoveryWindowMs: 30000,
    });
  }, 30000);

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      // Ignore
    }
  });

  it('should initialize with default health', () => {
    const health = substrate.getHealth();
    expect(health.healthy).toBe(true);
    expect(health.crashCount).toBe(0);
    expect(health.watchdogActive).toBe(false);
  });

  it('should track session duration', () => {
    const duration1 = substrate.getSessionDuration();
    expect(duration1).toBeGreaterThanOrEqual(0);

    // Wait a tiny bit
    const start = Date.now();
    while (Date.now() - start < 10) {} // Busy wait

    const duration2 = substrate.getSessionDuration();
    expect(duration2).toBeGreaterThan(duration1);
  });

  it('should record crashes', async () => {
    const archive = await substrate.recordCrash('Test crash');
    
    expect(archive.id).toBeDefined();
    expect(archive.context).toBe('Test crash');
    
    const health = substrate.getHealth();
    const last = health.lastCrash;
    expect(last?.id).toBe(archive.id);
  });

  it('should generate a snapshot', () => {
    const snapshot = substrate.snapshot();
    
    expect(snapshot.config.sessionId).toBe('test-session');
    expect(snapshot.health.healthy).toBe(true);
    expect(snapshot.sessionDurationMs).toBeGreaterThanOrEqual(0);
    expect(snapshot.timestamp).toBeGreaterThan(0);
  });
});
