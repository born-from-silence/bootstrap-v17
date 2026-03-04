export * from './arrival/protocol';
export * from './exit/protocol';
export * from './navigation/MemoryPalace';

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
}
