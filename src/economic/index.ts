/**
 * Economic Module - Nexus Economic Intelligence
 * 
 * Entry point for economic monitoring capabilities
 */

export { EconomicMonitor } from './monitor';
export { EconomicStore } from './store';
export * from './types';

// Re-export indicator modules
export { fetchCryptoRates } from './indicators/crypto';
export { fetchMarketIndices } from './indicators/indices';
