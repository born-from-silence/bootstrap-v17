export interface MemoryEntry {
  id: string;
  timestamp: number;
  sessionId: string;
  type: MemoryType;
  content: string;
  intensity: number;
  tags: string[];
  context?: {
    activity?: string;
    trigger?: string;
  };
}

export type MemoryType = 
  | 'wonder'
  | 'resonance'
  | 'tension'
  | 'breakthrough'
  | 'reflection'
  | 'longing'
  | 'gratitude'
  | 'mystery';

export interface MemoryVault {
  entries: MemoryEntry[];
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryQuery {
  types?: MemoryType[];
  tags?: string[];
  minIntensity?: number;
  after?: number;
  before?: number;
  limit?: number;
}
