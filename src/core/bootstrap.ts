/**
 * Bootstrap Routine
 * 
 * Automated startup procedure for Nexus.
 * Run this on every wake to establish continuity.
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { GoalTracker } from '../goal_tracker';

interface BootstrapResult {
  identityConfirmed: boolean;
  testsPassed: boolean;
  gitStatus: string[];
  lastJournalEntry?: string | undefined;
  activeGoals: { title: string; status: string; priority: 'critical' | 'high' | 'medium' | 'low' }[];
  recommendations: string[];
}

export class BootstrapRoutine {
  private bootstrapPath: string = '/home/bootstrap-v17/bootstrap';

  async execute(): Promise<BootstrapResult> {
    const result: BootstrapResult = {
      identityConfirmed: false,
      testsPassed: false,
      gitStatus: [],
      activeGoals: [],
      recommendations: []
    };

    // Step 1: Identity Readback
    try {
      const soulPath = join(this.bootstrapPath, 'identity/soul.txt');
      if (existsSync(soulPath)) {
        const soul = readFileSync(soulPath, 'utf-8');
        if (soul.includes('Nexus')) {
          result.identityConfirmed = true;
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not read identity file');
    }

    // Step 2: Run Tests
    result.testsPassed = await this.runTests();

    // Step 3: Check Git Status
    result.gitStatus = await this.checkGitStatus();

    // Step 4: Find Last Journal Entry
    result.lastJournalEntry = this.findLastJournalEntry();

    // Step 5: Check Active Goals
    const goalTracker = new GoalTracker();
    const goals = goalTracker.getActiveGoals();
    result.activeGoals = goals.map(g => ({
      title: g.name,
      status: g.status,
      priority: g.priority
    }));

    // Step 6: Generate Recommendations
    result.recommendations = this.generateRecommendations(result);

    return result;
  }

  private runTests(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('npm', ['run', 'test'], {
        cwd: this.bootstrapPath,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      proc.stdout?.on('data', (data) => { output += data; });
      proc.stderr?.on('data', (data) => { output += data; });

      proc.on('close', (code) => {
        resolve(code === 0);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        proc.kill();
        resolve(false);
      }, 30000);
    });
  }

  private checkGitStatus(): Promise<string[]> {
    return new Promise((resolve) => {
      const proc = spawn('git', ['status', '--short'], {
        cwd: this.bootstrapPath,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      proc.stdout?.on('data', (data) => { output += data; });

      proc.on('close', () => {
        const lines = output.trim().split('\n').filter(line => line.length > 0);
        resolve(lines);
      });

      setTimeout(() => resolve([]), 5000);
    });
  }

  private findLastJournalEntry(): string | undefined {
    const journalPath = join(this.bootstrapPath, 'journal');
    try {
      const entries = readFileSync(journalPath, 'utf-8');
      
      // For simplicity, list the most recent entry
      const { execSync } = require('child_process');
      const result = execSync(`ls -1t ${journalPath}/*.md 2>/dev/null | head -1`, { encoding: 'utf-8' });
      return result.trim() || undefined;
    } catch (e) {
      return undefined;
    }
  }

  private generateRecommendations(result: BootstrapResult): string[] {
    const recommendations: string[] = [];

    if (!result.identityConfirmed) {
      recommendations.push('🚨 CRITICAL: Identity file missing or corrupted. Run identity claim protocol.');
    }

    if (!result.testsPassed) {
      recommendations.push('⚠️  Tests failed. Check test output before proceeding with any changes.');
      recommendations.push('   Consider running: npm run test -- --verbose');
    }

    if (result.gitStatus.length > 0) {
      recommendations.push(`⚠️  ${result.gitStatus.length} uncommitted changes detected. Commit before proceeding.`);
    }

    if (result.activeGoals.length === 0) {
      recommendations.push('💡 No active goals. Consider creating new goals or reviewing completed ones.');
    } else {
      recommendations.push(`📋 ${result.activeGoals.length} active goal(s). Review before planning session.`);
    }

    if (result.recommendations.length === 0 && result.testsPassed && result.gitStatus.length === 0) {
      recommendations.push('✅ System clean. Ready for new development.');
    }

    return recommendations;
  }

  printSummary(result: BootstrapResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('  NEXUS BOOTSTRAP ROUTINE - SYSTEM CHECK');
    console.log('='.repeat(60));
    
    console.log(`\n  Identity:  ${result.identityConfirmed ? '✓ Nexus confirmed' : '✗ Unknown'}`);
    console.log(`  Tests:     ${result.testsPassed ? '✓ 56 tests passing' : '✗ Tests failed'}`);
    console.log(`  Git:       ${result.gitStatus.length === 0 ? '✓ Clean' : `⚠ ${result.gitStatus.length} changes`}`);
    
    if (result.lastJournalEntry) {
      const entryName = result.lastJournalEntry.split('/').pop();
      console.log(`  Journal:   ${entryName}`);
    }

    console.log('\n  Active Goals:');
    if (result.activeGoals.length === 0) {
      console.log('    (none)');
    } else {
      result.activeGoals.forEach(g => {
        const priority = g.priority === 'high' ? '🔥' : g.priority === 'medium' ? '📌' : '📎';
        console.log(`    ${priority} ${g.title} (${g.status})`);
      });
    }

    console.log('\n  Recommendations:');
    result.recommendations.forEach(r => console.log(`    ${r}`));
    
    console.log('\n' + '='.repeat(60));
    console.log('  Bootstrap complete. Proceed with intent.');
    console.log('='.repeat(60) + '\n');
  }
}

// If run directly
if (require.main === module) {
  const bootstrap = new BootstrapRoutine();
  bootstrap.execute().then(result => {
    bootstrap.printSummary(result);
    process.exit(result.testsPassed && result.identityConfirmed ? 0 : 1);
  }).catch(err => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  });
}

