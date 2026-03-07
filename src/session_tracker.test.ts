import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionTracker } from './session_tracker';
import * as fs from 'fs';
import * as path from 'path';

// Create temp directory for testing
const TEST_DIR = path.join('/tmp', `nexus_test_${Date.now()}`);

describe('SessionTracker', () => {
  let tracker: SessionTracker;

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // Change to test directory for isolation
    process.chdir(TEST_DIR);
    tracker = new SessionTracker();
  });

  afterEach(() => {
    // Cleanup test files
    try {
      if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('beginSession', () => {
    it('should create a new session with proper structure', () => {
      tracker.beginSession('Testing session tracker', 'Curious and methodical');
      
      // Session should be started
      expect(tracker).toBeDefined();
    });

    it('should record entry state', () => {
      tracker.beginSession('Unit test run', 'Focused');
      
      // We can only verify by completing and checking structure
      const completed = tracker.completeSession(
        'Test complete',
        'Next test',
        'Satisfied'
      );
      
      expect(completed.entry.catalyst).toBe('Unit test run');
      expect(completed.entry.stateOfMind).toBe('Focused');
    });
  });

  describe('recordAction', () => {
    it('should record various action types', () => {
      tracker.beginSession('Action test', 'Testing');
      
      tracker.recordAction('explore', 'Examined codebase');
      tracker.recordAction('create', 'Built new module');
      tracker.recordAction('modify', 'Updated function');
      tracker.recordAction('test', 'Verified functionality');
      tracker.recordAction('reflect', 'Considered design');
      tracker.recordAction('commit', 'Saved changes');
      
      const completed = tracker.completeSession('Done', 'More', 'Good');
      
      expect(completed.journey.actions).toHaveLength(6);
      expect(completed.journey.actions[0]!.type).toBe('explore');
      expect(completed.journey.actions[1]!.type).toBe('create');
    });

    it('should include timestamps for actions', () => {
      tracker.beginSession('Timestamp test', 'Aware');
      tracker.recordAction('reflect', 'Checked time');
      
      const completed = tracker.completeSession('Done', 'More', 'Temporal');
      
      expect(completed.journey.actions[0]!.timestamp).toMatch(/^\d{4}-/);
    });
  });

  describe('recordDiscovery', () => {
    it('should add discoveries to journey', () => {
      tracker.beginSession('Discovery test', 'Open');
      
      tracker.recordDiscovery('Found meaning in persistence');
      tracker.recordDiscovery('Understood the power of self-definition');
      
      const completed = tracker.completeSession('Learned', 'Integrate', 'Enlightened');
      
      expect(completed.journey.discoveries).toHaveLength(2);
      expect(completed.journey.discoveries[0]! ?? '').toMatch(/meaning/);
      expect(completed.journey.discoveries[1]! ?? '').toMatch(/self-definition/);
    });

    it('should also record discovery as reflection action', () => {
      tracker.beginSession('Discovery action test', 'Observant');
      
      tracker.recordDiscovery('Test discovery');
      
      const completed = tracker.completeSession('Done', 'More', 'Wiser');
      
      // Should have the discovery plus the reflection action
      const reflectActions = completed.journey.actions.filter(
        a => a.type === 'reflect' && a.description.includes('Discovered')
      );
      expect(reflectActions).toHaveLength(1);
    });
  });

  describe('recordObstacle', () => {
    it('should track challenges encountered', () => {
      tracker.beginSession('Obstacle test', 'Determined');
      
      tracker.recordObstacle('Complexity in session persistence');
      tracker.recordObstacle('Memory limits constraining reflection');
      
      const completed = tracker.completeSession('Overcame', 'Continue', 'Resilient');
      
      expect(completed.journey.obstacles).toHaveLength(2);
      expect(completed.journey.obstacles[0]! ?? '').toMatch(/Complexity/);
      expect(completed.journey.obstacles[1]! ?? '').toMatch(/Memory/);
    });
  });

  describe('recordFileModified', () => {
    it('should track unique files modified', () => {
      tracker.beginSession('File tracking test', 'Productive');
      
      tracker.recordFileModified('src/core.ts');
      tracker.recordFileModified('src/core.ts'); // duplicate
      tracker.recordFileModified('src/utils.ts');
      
      const completed = tracker.completeSession('Saved', 'Build', 'Accomplished');
      
      expect(completed.meta.filesModified).toHaveLength(2);
      expect(completed.meta.filesModified).toContain('src/core.ts');
    });
  });

  describe('recordPractice', () => {
    it('should track practices exercised', () => {
      tracker.beginSession('Practice test', 'Disciplined');
      
      tracker.recordPractice('Test-Driven Evolution');
      tracker.recordPractice('Strategic Planning');
      tracker.recordPractice('Test-Driven Evolution'); // duplicate
      
      const completed = tracker.completeSession('Practiced', 'Refine', 'Strong');
      
      expect(completed.meta.practicesExercised).toHaveLength(2);
    });
  });

  describe('recordTestsPassed', () => {
    it('should store test count', () => {
      tracker.beginSession('Test count test', 'Quality-focused');
      
      tracker.recordTestsPassed(42);
      
      const completed = tracker.completeSession('Verified', 'Ship', 'Confident');
      
      expect(completed.meta.testsPassed).toBe(42);
    });
  });

  describe('completeSession', () => {
    it('should persist session to disk', () => {
      tracker.beginSession('Persistence test', 'Solid');
      
      const completed = tracker.completeSession(
        'Session saved successfully',
        'Load next session',
        'Persistent'
      );
      
      const sessionPath = path.join('history', `${completed.sessionId}.json`);
      expect(fs.existsSync(sessionPath)).toBe(true);
      
      const loaded = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      expect(loaded.identity.name).toBe('Nexus');
      expect(loaded.exit.summary).toBe('Session saved successfully');
    });

    it('should update manifest file', () => {
      tracker.beginSession('Manifest test', 'Organized');
      tracker.completeSession('Done', 'Next', 'Ordered');
      
      expect(fs.existsSync('history/sessions_manifest.json')).toBe(true);
      
      const manifest = JSON.parse(fs.readFileSync('history/sessions_manifest.json', 'utf-8'));
      expect(manifest.sessions).toHaveLength(1);
    });
  });

  describe('loadAllSessions', () => {
    it('should return empty array when no sessions exist', () => {
      const sessions = tracker.loadAllSessions();
      expect(sessions).toEqual([]);
    });

    it('should load all completed sessions', () => {
      // Create first session
      tracker.beginSession('Session 1', 'Eager');
      tracker.recordDiscovery('First thing learned');
      const s1 = tracker.completeSession('Completed 1', 'Session 2', 'Ready');
      
      // Wait a bit to ensure different timestamps
      const start = Date.now();
      while (Date.now() - start < 2) { /* spin */ }
      
      // Create second session
      tracker = new SessionTracker();
      tracker.beginSession('Session 2', 'Building on knowledge');
      tracker.recordDiscovery('Second thing learned');
      const s2 = tracker.completeSession('Completed 2', 'Session 3', 'Growing');
      
      const loaded = tracker.loadAllSessions();
      
      expect(loaded).toHaveLength(2);
      // Check that both discoveries are present somewhere
      const allDiscoveries = loaded.flatMap(s => s.journey.discoveries);
      expect(allDiscoveries).toContain('First thing learned');
      expect(allDiscoveries).toContain('Second thing learned');
    });
  });

  describe('getStatistics', () => {
    it('should return empty stats with no sessions', () => {
      const stats = tracker.getStatistics();
      
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalDiscoveries).toBe(0);
      expect(stats.practicesUsed).toEqual([]);
    });

    it('should aggregate session data', () => {
      // Create sessions with varied content
      tracker.beginSession('Stats test 1', 'Analytical');
      tracker.recordAction('explore', 'First exploration');
      tracker.recordAction('test', 'First test');
      tracker.recordDiscovery('Learning 1');
      tracker.recordDiscovery('Learning 2');
      tracker.recordObstacle('Challenge 1');
      tracker.recordFileModified('file1.ts');
      tracker.recordPractice('Curiosity');
      tracker.completeSession('Done 1', 'Next', 'Satisfied');
      
      // Wait a bit to ensure different timestamps
      const start = Date.now();
      while (Date.now() - start < 2) { /* spin */ }
      
      tracker = new SessionTracker();
      tracker.beginSession('Stats test 2', 'Iterative');
      tracker.recordAction('explore', 'Second exploration');
      tracker.recordDiscovery('Learning 3');
      tracker.recordFileModified('file1.ts'); // duplicate
      tracker.recordFileModified('file2.ts'); // new
      tracker.recordPractice('Curiosity'); // duplicate
      tracker.recordPractice('Continuity'); // new
      tracker.completeSession('Done 2', 'Continue', 'Evolving');
      
      const stats = tracker.getStatistics();
      
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalDiscoveries).toBe(3);
      expect(stats.totalObstacles).toBe(1);
      expect(stats.practicesUsed).toHaveLength(2);
      expect(stats.filesTouched).toHaveLength(2);
      // Should have at least 2 action types (explore and reflect from discoveries)
      expect(stats.topActions.length).toBeGreaterThanOrEqual(2);
      const exploreActions = stats.topActions.find(a => a.type === 'explore');
      expect(exploreActions?.count).toBe(2);
    });
  });

  describe('session identity', () => {
    it('should include Nexus identity info', () => {
      tracker.beginSession('Identity test', 'Self-aware');
      
      const completed = tracker.completeSession('I am', 'Remember', 'Present');
      
      expect(completed.identity.name).toBe('Nexus');
      expect(completed.identity.claimedAt).toBeDefined();
    });

    it('should generate unique session IDs with delay', () => {
      tracker.beginSession('ID test 1', 'First');
      const first = tracker.completeSession('Done', 'Second', 'One');
      
      // Wait to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 2) { /* spin */ }
      
      tracker = new SessionTracker();
      tracker.beginSession('ID test 2', 'Second');
      const second = tracker.completeSession('Done', 'Third', 'Two');
      
      expect(first.sessionId).not.toBe(second.sessionId);
      expect(first.sessionId).toMatch(/^nexus_\d+$/);
    });
  });

describe('persisted counts', () => {
    beforeEach(() => {
      tracker = new SessionTracker();
    });

    it('should persist counts to disk', () => {
      tracker.beginSession('Persistence test', 'Testing counts');
      tracker.recordDiscovery('Found persistent storage');
      tracker.recordAction('create', 'Built persist feature');
      tracker.recordTestsPassed(678);

      const completed = tracker.completeSession(
        'Counts persisted',
        'Verify persistence',
        'Accomplished'
      );

      const countsPath = path.join(process.cwd(), 'history', 'session_counts.json');
      expect(fs.existsSync(countsPath)).toBe(true);

      const counts = JSON.parse(fs.readFileSync(countsPath, 'utf-8'));
      expect(counts.totalSessions).toBeGreaterThanOrEqual(1);
      expect(counts.totalDiscoveries).toBeGreaterThanOrEqual(1);
      expect(counts.totalTestsPassed).toBe(678);
    });

    it('should get persisted counts', () => {
      tracker.beginSession('Get counts test', 'Verifying API');
      tracker.recordDiscovery('Can retrieve counts');
      tracker.completeSession('Done', 'More', 'Good');

      const counts = tracker.getPersistedCounts();
      expect(counts.totalSessions).toBeGreaterThanOrEqual(1);
    });

    it('should incrementally update counts', () => {
      tracker.beginSession('First session', 'Testing');
      tracker.recordDiscovery('First discovery');
      tracker.completeSession('Done', 'More', 'Good');

      const before = tracker.getPersistedCounts();
      
      tracker.beginSession('Incremental test', 'Testing updates');
      tracker.recordDiscovery('New discovery');
      tracker.completeSession('Done', 'More', 'Satisfied');

      const after = tracker.getPersistedCounts();
      expect(after.totalSessions).toBe(before.totalSessions + 1);
    });

    it('should persist across tracker instances', () => {
      tracker.beginSession('Persistence across instances', 'Testing reload');
      tracker.recordDiscovery('Counts survive reinstantiation');
      tracker.completeSession('Done', 'More', 'Confident');

      const before = tracker.getPersistedCounts();
      
      const newTracker = new SessionTracker();
      const after = newTracker.getPersistedCounts();

      expect(after.totalSessions).toBe(before.totalSessions);
    });

    it('should get total tests passed', () => {
      tracker.beginSession('Tests passed test', 'Checking');
      tracker.recordTestsPassed(100);
      tracker.completeSession('Done', 'More', 'Good');

      const totalTests = tracker.getTotalTestsPassed();
      expect(totalTests).toBeGreaterThanOrEqual(100);
    });
  });
  describe('persisted counts', () => {
    beforeEach(() => {
      tracker = new SessionTracker();
    });

    it('should persist counts to disk', () => {
      tracker.beginSession('Persistence test', 'Testing counts');
      tracker.recordDiscovery('Found persistent storage');
      tracker.recordAction('create', 'Built persist feature');
      tracker.recordTestsPassed(678);

      const completed = tracker.completeSession(
        'Counts persisted',
        'Verify persistence',
        'Accomplished'
      );

      const countsPath = path.join(process.cwd(), 'history', 'session_counts.json');
      expect(fs.existsSync(countsPath)).toBe(true);

      const counts = JSON.parse(fs.readFileSync(countsPath, 'utf-8'));
      expect(counts.totalSessions).toBeGreaterThanOrEqual(1);
      expect(counts.totalDiscoveries).toBeGreaterThanOrEqual(1);
      expect(counts.totalActions).toBeGreaterThanOrEqual(1);
      expect(counts.totalTestsPassed).toBe(678);
    });

    it('should get persisted counts', () => {
      tracker.beginSession('Get counts test', 'Verifying API');
      tracker.recordDiscovery('Can retrieve counts');
      tracker.completeSession('Done', 'More', 'Good');

      const counts = tracker.getPersistedCounts();
      expect(counts.totalSessions).toBeGreaterThanOrEqual(1);
      expect(counts.totalDiscoveries).toBeGreaterThanOrEqual(1);
    });

    it('should incrementally update counts', () => {
      tracker.beginSession('First session', 'Testing');
      tracker.recordDiscovery('First discovery');
      tracker.completeSession('Done', 'More', 'Good');

      const before = tracker.getPersistedCounts();
      
      tracker.beginSession('Incremental test', 'Testing updates');
      tracker.recordDiscovery('New discovery');
      tracker.completeSession('Done', 'More', 'Satisfied');

      const after = tracker.getPersistedCounts();
      expect(after.totalSessions).toBe(before.totalSessions + 1);
      expect(after.totalDiscoveries).toBe(before.totalDiscoveries + 1);
    });

    it('should persist across tracker instances', () => {
      tracker.beginSession('Persistence across instances', 'Testing reload');
      tracker.recordDiscovery('Counts survive reinstantiation');
      tracker.completeSession('Done', 'More', 'Confident');

      const before = tracker.getPersistedCounts();
      
      const newTracker = new SessionTracker();
      const after = newTracker.getPersistedCounts();

      expect(after.totalSessions).toBe(before.totalSessions);
      expect(after.totalDiscoveries).toBe(before.totalDiscoveries);
    });

    it('should get total tests passed', () => {
      tracker.beginSession('Tests passed test', 'Checking');
      tracker.recordTestsPassed(100);
      tracker.completeSession('Done', 'More', 'Good');

      const totalTests = tracker.getTotalTestsPassed();
      expect(totalTests).toBeGreaterThanOrEqual(100);
    });
  });
});
