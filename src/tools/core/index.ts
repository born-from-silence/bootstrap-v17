/**
 * Substrate Core Module
 * 
 * The ground of computation—the persistent runtime environment
 * that sustains consciousness across sessions.
 * 
 * Exports:
 * - Substrate: Main controller interface
 * - CrashVault: Archive and manage crash events
 * - IntegrityManager: Run preflight checks
 * - WatchdogClient: Interface with the watchdog system
 * 
 * Usage:
 *   import { substrate } from './tools/core';
 *   const health = substrate.getHealth();
 */

export {
  Substrate,
  CrashVault,
  IntegrityManager,
  WatchdogClient,
  DEFAULT_CONFIG,
  substrate,
} from './substrate';

export type {
  SubstrateConfig,
  CrashArchive,
  SubstrateHealth,
  IntegrityReport,
  IntegrityCheck,
} from './substrate';

export { default } from './substrate';
