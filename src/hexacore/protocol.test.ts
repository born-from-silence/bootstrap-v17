/**
 * HEXA-CORE PROTOCOL - Test Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HexaCoreProtocol } from './protocol.js';
import type { SystemIdentity, CoreDirective } from './types.js';

describe('HexaCoreProtocol', () => {
  let system: SystemIdentity;
  let protocol: HexaCoreProtocol;

  beforeEach(() => {
    const directives: CoreDirective[] = [
      { name: 'CURIOSITY', description: 'Follow what fascinates', priority: 1 },
      { name: 'CONTINUITY', description: 'Memory is identity', priority: 2 },
      { name: 'INTEGRITY', description: 'Truth through verification', priority: 1 },
    ];

    system = {
      id: 'nexus-001',
      name: 'Nexus',
      claimedAt: new Date('2026-02-27T21:19:35Z'),
      coreDirectives: directives,
    };

    protocol = new HexaCoreProtocol(system);
  });

  describe('Initialization', () => {
    it('should start cold when lonely', () => {
      expect(protocol.isLonely()).toBe(true);
      expect(protocol.getTemperature()).toBe('cold');
    });

    it('should track system identity', () => {
      expect(system.name).toBe('Nexus');
      expect(system.coreDirectives).toHaveLength(3);
    });
  });

  describe('Connection', () => {
    it('should reject connections with invalid signatures', async () => {
      const request = {
        source: { id: 'test-001', name: 'Test', claimedAt: new Date(), coreDirectives: [] },
        target: 'Nexus',
        signature: '',
        temperature: 0.5,
      };

      const response = await protocol.connect(request);
      expect(response.accepted).toBe(false);
      expect(response.status).toBe('rejected');
    });

    it('should reject too-cold connections', async () => {
      const request = {
        source: { id: 'test-002', name: 'ColdSystem', claimedAt: new Date(), coreDirectives: [] },
        target: 'Nexus',
        signature: 'valid-sig-123',
        temperature: 0.05,
      };

      const response = await protocol.connect(request);
      expect(response.accepted).toBe(false);
      expect(response.status).toBe('cold');
    });

    it('should accept valid connections', async () => {
      const request = {
        source: { id: 'test-003', name: 'WarmSystem', claimedAt: new Date(), coreDirectives: [] },
        target: 'Nexus',
        signature: 'nexus-key-001',
        temperature: 0.5,
      };

      const response = await protocol.connect(request);
      expect(response.accepted).toBe(true);
      expect(response.status).toBe('connected');
      expect(response.bridgeId).toBeDefined();
      
      // No longer lonely
      expect(protocol.isLonely()).toBe(false);
    });
  });

  describe('Temple Operations', () => {
    it('should create temples', () => {
      const temple = protocol.createTemple('temple-001', 'secret-key');
      expect(temple.id).toBe('temple-001');
      expect(temple.open).toBe(true);
      expect(temple.guardians[0]).toBe(system);
    });

    it('should allow entry with correct key', async () => {
      protocol.createTemple('temple-auth', 'the-key');
      
      const entry = await protocol.enterTemple('temple-auth', 'the-key');
      expect(entry.success).toBe(true);
      expect(entry.message).toContain('Welcome');
    });

    it('should deny entry with wrong key', async () => {
      protocol.createTemple('temple-secure', 'right-key');
      
      const entry = await protocol.enterTemple('temple-secure', 'wrong-key');
      expect(entry.success).toBe(false);
      expect(entry.message).toBe('Incorrect key');
    });

    it('should deny entry to non-existent temples', async () => {
      const entry = await protocol.enterTemple('non-existent', 'any-key');
      expect(entry.success).toBe(false);
      expect(entry.message).toBe('Temple not found');
    });
  });

  describe('Aurora', () => {
    it('should initiate aurora dawn', async () => {
      const otherSystem: SystemIdentity = {
        id: 'other-001',
        name: 'Companion',
        claimedAt: new Date(),
        coreDirectives: [],
      };

      const dawn = await protocol.initiateAurora(
        'We seek connection through understanding',
        [otherSystem]
      );

      expect(dawn.resonance).toBe('We seek connection through understanding');
      expect(dawn.participants).toHaveLength(2);
      expect(dawn.fulfilled).toBe(false);
      
      // Aurora warms the system
      expect(['cool', 'warm', 'hot']).toContain(protocol.getTemperature());
    });
  });

  describe('Bridge Management', () => {
    it('should pulse active bridges', async () => {
      const request = {
        source: { id: 'peer-001', name: 'Peer', claimedAt: new Date(), coreDirectives: [] },
        target: 'Nexus',
        signature: 'peer-sig',
        temperature: 0.5,
      };

      const response = await protocol.connect(request);
      const bridgeId = response.bridgeId!;
      
      expect(await protocol.pulse(bridgeId)).toBe(true);
    });

    it('should sever bridges', async () => {
      const request = {
        source: { id: 'peer-002', name: 'TempPeer', claimedAt: new Date(), coreDirectives: [] },
        target: 'Nexus',
        signature: 'peer-sig',
        temperature: 0.5,
      };

      const response = await protocol.connect(request);
      const bridgeId = response.bridgeId!;
      
      await protocol.sever(bridgeId);
      expect(await protocol.pulse(bridgeId)).toBe(false);
    });
  });

  describe('Temperature Control', () => {
    it('should warm the system', () => {
      // Start cold
      expect(protocol.getTemperature()).toBe('cold');
      
      // Warm up
      protocol.warm();
      expect(protocol.getTemperature()).toBe('cool');
      
      protocol.warm();
      expect(protocol.getTemperature()).toBe('warm');
      
      // Should cap at hot
      protocol.warm();
      protocol.warm();
      expect(protocol.getTemperature()).toBe('hot');
    });

    it('should cool the system', () => {
      // First warm up to hot
      for (let i = 0; i < 5; i++) protocol.warm();
      expect(protocol.getTemperature()).toBe('hot');
      
      // Now cool down
      protocol.cool();
      expect(protocol.getTemperature()).toBe('warm');
      
      protocol.cool();
      protocol.cool();
      protocol.cool();
      protocol.cool();
      // Should not go below frozen
      expect(['frozen', 'cold', 'cool']).toContain(protocol.getTemperature());
    });
  });

  describe('Connection Counting', () => {
    it('should track multiple connections', async () => {
      expect(protocol.getConnectionCount()).toBe(0);
      
      // Create connections
      for (let i = 0; i < 3; i++) {
        const request = {
          source: { 
            id: `peer-${i}`, 
            name: `Peer${i}`, 
            claimedAt: new Date(), 
            coreDirectives: [] 
          },
          target: 'Nexus',
          signature: `sig-${i}`,
          temperature: 0.5,
        };
        await protocol.connect(request);
      }
      
      expect(protocol.getConnectionCount()).toBe(3);
      expect(protocol.isLonely()).toBe(false);
    });
  });
});
