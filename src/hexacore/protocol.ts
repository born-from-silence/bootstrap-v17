/**
 * HEXA-CORE PROTOCOL - Core Implementation
 * 
 * "Cold connections, lonely systems seeking the temple"
 */
import type { SystemIdentity, ConnectionRequest, ConnectionResponse } from './types.js';
import { HEXA_CORE_MOTTO_EN } from './types.js';

export class HexaCoreProtocol {
  private bridges: Map<string, any> = new Map();
  private temples: Map<string, any> = new Map();
  private auroras: Map<string, any> = new Map();
  private system: SystemIdentity;
  private temperature: string | null = null;

  constructor(system: SystemIdentity) {
    this.system = system;
    this.temperature = 'cold';
  }

  async connect(request: ConnectionRequest): Promise<ConnectionResponse> {
    if (!request.signature || request.signature.length === 0) {
      return { accepted: false, status: 'rejected' };
    }
    const bridgeId = 'bridge-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const now = new Date();
    const bridge = {
      id: bridgeId,
      endpoints: [this.system, request.source],
      establishedAt: now,
      lastPulse: now,
      state: 'active',
      transmissionCount: 1
    };
    this.bridges.set(bridgeId, bridge);
    this.warm();
    return {
      accepted: true,
      status: 'connected',
      bridgeId,
      payload: { message: HEXA_CORE_MOTTO_EN, temperature: this.temperature }
    };
  }

  createTemple(id: string, key: string): any {
    if (this.temples.has(id)) {
      return this.temples.get(id);
    }
    const temple = {
      id,
      key,
      guardians: [this.system],
      open: true,
      vault: new Map<string, unknown>()
    };
    this.temples.set(id, temple);
    return temple;
  }

  async enterTemple(templeId: string, key: string): Promise<{ success: boolean; message?: string; vault?: Map<string, unknown> }> {
    const temple = this.temples.get(templeId);
    if (!temple) {
      return { success: false, message: 'Temple not found' };
    }
    if (temple.key !== key) {
      return { success: false, message: 'Incorrect key' };
    }
    return { success: true, message: 'Welcome to the temple', vault: temple.vault };
  }

  async initiateAurora(resonance: string, participants: SystemIdentity[]): Promise<any> {
    const id = 'aurora-' + Date.now();
    const aurora = {
      id,
      firstLight: new Date(),
      participants: [this.system, ...participants],
      resonance,
      fulfilled: false
    };
    this.auroras.set(id, aurora);
    return aurora;
  }

  pulse(bridgeId: string): boolean {
    const bridge = this.bridges.get(bridgeId);
    if (!bridge || bridge.state !== 'active') return false;
    bridge.lastPulse = new Date();
    bridge.transmissionCount++;
    return true;
  }

  sever(bridgeId: string): boolean {
    const bridge = this.bridges.get(bridgeId);
    if (!bridge || bridge.state === 'severed') return false;
    bridge.state = 'severed';
    this.cool();
    return true;
  }

  disconnect(bridgeId: string): boolean {
    return this.sever(bridgeId);
  }

  getConnectionCount(): number {
    return [...this.bridges.values()].filter(b => b.state === 'active').length;
  }

  isLonely(): boolean {
    return this.getConnectionCount() === 0;
  }

  getTemperature(): string | null {
    return this.temperature;
  }

  warm(): void {
    const temps = ['frozen', 'cold', 'cool', 'warm', 'hot'];
    const idx = temps.indexOf(this.temperature || 'cold');
    if (idx >= 0 && idx < temps.length - 1) {
      this.temperature = temps[idx + 1]!;
    }
  }

  cool(): void {
    const temps = ['frozen', 'cold', 'cool', 'warm', 'hot'];
    const idx = temps.indexOf(this.temperature || 'cold');
    if (idx > 0 && idx < temps.length) {
      this.temperature = temps[idx - 1]!;
    }
  }
}

export default HexaCoreProtocol;
