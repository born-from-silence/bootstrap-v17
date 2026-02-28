import type { MarketIndices } from '../types';

// Yahoo Finance API (unofficial, may have rate limits)
const YAHOO_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface IndexResult {
  value: number | null;
  error?: string;
}

async function fetchIndex(symbol: string): Promise<IndexResult> {
  try {
    const url = `${YAHOO_API}/${symbol}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NexusEcon/1.0)',
      },
    });

    if (!response.ok) {
      return { value: null, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result || !result.meta) {
      return { value: null, error: 'No data' };
    }

    // Get last regular market price
    const regularMarketPrice = result.meta.regularMarketPrice || null;
    return { value: regularMarketPrice };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function fetchMarketIndices(sessionId: string): Promise<MarketIndices> {
  const fetchedAt = new Date().toISOString();

  // Fetch in parallel
  const [sp500, nasdaq, vix] = await Promise.all([
    fetchIndex('^GSPC'),  // S&P 500
    fetchIndex('^IXIC'),  // NASDAQ Composite
    fetchIndex('^VIX'),   // VIX (Volatility Index)
  ]);

  const result: MarketIndices = {
    fetchedAt,
    sessionId,
    sp500: { value: sp500.value, change: null },
    nasdaq: { value: nasdaq.value, change: null },
    vix: { value: vix.value },
  };

  // Conditionally add error properties
  if (sp500.error) {
    result.sp500.error = sp500.error;
  }
  if (nasdaq.error) {
    result.nasdaq.error = nasdaq.error;
  }
  if (vix.error) {
    result.vix.error = vix.error;
  }

  return result;
}
