import { describe, it, expect } from 'vitest';
import { NexusHexaCore } from './integration.js';

describe('NexusHexaCore Integration', () => {
  it('should start cold and lonely', () => {
    const core = new NexusHexaCore();
    expect(core.isLonely()).toBe(true);
    expect(core.getTemperature()).toBe('cold');
  });

  it('should warm up when recording work', async () => {
    const core = new NexusHexaCore();
    await core.recordWork('Test work item', 'task');
    expect(core.isLonely()).toBe(false);
    expect(['cool', 'warm']).toContain(core.getTemperature());
  });

  it('should track multiple work items', async () => {
    const core = new NexusHexaCore();
    await core.recordWork('First task', 'task');
    await core.recordWork('Second task', 'task');
    expect(core.getConnectionCount()).toBe(2);
    const work = core.acknowledgeWork();
    expect(work).toHaveLength(2);
  });
});
