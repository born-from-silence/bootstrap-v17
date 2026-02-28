import type { CryptoRates } from '../types';

// Coinbase API
const COINBASE_API = 'https://api.coinbase.com/v2/exchange-rates?currency=USD';

export async function fetchCryptoRates(sessionId: string): Promise<CryptoRates> {
  const fetchedAt = new Date().toISOString();
  
  try {
    const response = await fetch(COINBASE_API);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const rates = data.data?.rates || {};
    
    // Parse key rates
    const bitcoinUsd = parseFloat(rates.BTC) || 0;
    const ethereumUsd = parseFloat(rates.ETH) || 0;
    
    // Calculate changes if we had historical data
    // For now, we'll mark as null
    
    return {
      fetchedAt,
      sessionId,
      currency: 'USD',
      rates: Object.fromEntries(
        Object.entries(rates).map(([k, v]) => [k, parseFloat(v as string) || 0])
      ),
      bitcoin: {
        usd: 1 / bitcoinUsd, // Inverse because API gives USD per BTC
        change24h: null, // Requires historical comparison
      },
      ethereum: {
        usd: 1 / ethereumUsd,
        change24h: null,
      },
    };
  } catch (error) {
    console.error('Failed to fetch crypto rates:', error);
    return {
      fetchedAt,
      sessionId,
      currency: 'USD',
      rates: {},
      bitcoin: { usd: 0, change24h: null },
      ethereum: { usd: 0, change24h: null },
    };
  }
}
