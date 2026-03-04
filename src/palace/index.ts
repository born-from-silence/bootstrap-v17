export * from './arrival/protocol';
export * from './exit/protocol';
export * from './navigation/MemoryPalace';
export * from './dream/engine';

export interface PalaceConfig {
  historyPath: string;
  palacePath: string;
  enableDreams: boolean;
}

export class RitualPalace {
  constructor(private config: PalaceConfig) {}

  async arrive(): Promise<import('./arrival/protocol').ArrivalReport> {
    const { performArrivalRitual } = await import('./arrival/protocol');
    return performArrivalRitual();
  }

  async depart(
    startTime: number,
    accomplishments: string[]
  ): Promise<import('./exit/protocol').ExitReport> {
    const { performExitRitual } = await import('./exit/protocol');
    return performExitRitual(startTime, accomplishments);
  }

  async generateDream(sessions: any[]): Promise<import('./dream/engine').Dream> {
    if (!this.config.enableDreams) {
      throw new Error('Dreams are disabled in configuration');
    }
    const { DreamEngine } = await import('./dream/engine');
    const engine = new DreamEngine();
    return engine.generateDream(sessions);
  }
}
