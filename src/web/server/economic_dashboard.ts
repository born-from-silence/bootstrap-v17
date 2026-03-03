import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || "/home/bootstrap-v17/bootstrap/data";
const ECONOMIC_DIR = path.join(DATA_DIR, "economic");

export interface PricePoint {
  timestamp: string;
  value: number;
  source: string;
}

export interface TrendData {
  symbol: string;
  name: string;
  currentValue: number | null;
  change24h: number | null;
  history: PricePoint[];
  trend: "up" | "down" | "sideways" | "unknown";
}

export interface DashboardData {
  timestamp: string;
  sources: {
    crypto: boolean;
    indices: boolean;
  };
  overview: {
    totalSnapshots: number;
    snapshotRange: {
      oldest: string | null;
      newest: string | null;
    };
    lastUpdated: string | null;
  };
  assets: {
    bitcoin: TrendData;
    ethereum: TrendData;
    sp500: TrendData;
    nasdaq: TrendData;
    vix: TrendData;
  };
  volatilitySignal: "high" | "moderate" | "low" | "unknown";
}

const router = Router();

/**
 * Load economic snapshot from file
 */
async function loadSnapshot(snapshotId: string): Promise<any | null> {
  try {
    const filePath = path.join(ECONOMIC_DIR, `snapshot_${snapshotId}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Load the index file to get snapshot list
 */
async function loadSnapshotIndex(): Promise<string[]> {
  try {
    const indexPath = path.join(ECONOMIC_DIR, "index.json");
    const content = await fs.readFile(indexPath, "utf-8");
    const data = JSON.parse(content);
    return data.snapshots || [];
  } catch {
    return [];
  }
}

/**
 * Calculate trend from price history
 */
function calculateTrend(history: PricePoint[]): TrendData["trend"] {
  if (history.length < 3) return "unknown";
  
  const recent = history.slice(-3);
  const first = recent[0];
  const last = recent[recent.length - 1];
  
  if (!first || !last) return "unknown";
  
  const firstValue = first.value;
  const lastValue = last.value;
  
  const change = ((lastValue - firstValue) / firstValue) * 100;
  
  if (change > 2) return "up";
  if (change < -2) return "down";
  return "sideways";
}

/**
 * Build dashboard data from snapshots
 */
async function buildDashboardData(): Promise<DashboardData> {
  const snapshotIds = await loadSnapshotIndex();
  const snapshots: any[] = [];
  
  // Load last 10 snapshots for history
  const recentIds = snapshotIds.slice(-10);
  for (const id of recentIds) {
    const snap = await loadSnapshot(id);
    if (snap) snapshots.push(snap);
  }
  
  // Extract price histories
  const bitcoinHistory: PricePoint[] = [];
  const ethereumHistory: PricePoint[] = [];
  const sp500History: PricePoint[] = [];
  const nasdaqHistory: PricePoint[] = [];
  const vixHistory: PricePoint[] = [];
  
  for (const snap of snapshots) {
    if (!snap) continue;
    const ts = snap.capturedAt;
    
    if (snap.crypto?.bitcoin?.usd) {
      bitcoinHistory.push({
        timestamp: ts,
        value: snap.crypto.bitcoin.usd,
        source: "coinbase"
      });
    }
    
    if (snap.crypto?.ethereum?.usd) {
      ethereumHistory.push({
        timestamp: ts,
        value: snap.crypto.ethereum.usd,
        source: "coinbase"
      });
    }
    
    if (snap.indices?.sp500?.value) {
      sp500History.push({
        timestamp: ts,
        value: snap.indices.sp500.value,
        source: "yahoo"
      });
    }
    
    if (snap.indices?.nasdaq?.value) {
      nasdaqHistory.push({
        timestamp: ts,
        value: snap.indices.nasdaq.value,
        source: "yahoo"
      });
    }
    
    if (snap.indices?.vix?.value) {
      vixHistory.push({
        timestamp: ts,
        value: snap.indices.vix.value,
        source: "yahoo"
      });
    }
  }
  
  // Get current values (last in history)
  const lastSnapshot = snapshots[snapshots.length - 1];
  
  // Calculate 24h change (comparing first and last if within 24h span)
  const calcChange = (history: PricePoint[]): number | null => {
    if (history.length < 2) return null;
    const first = history[0];
    const last = history[history.length - 1];
    if (!first || !last) return null;
    const firstValue = first.value;
    const lastValue = last.value;
    return ((lastValue - firstValue) / firstValue) * 100;
  };
  
  // Determine volatility signal from VIX
  const currentVix = lastSnapshot?.indices?.vix?.value;
  let volatilitySignal: DashboardData["volatilitySignal"] = "unknown";
  if (currentVix !== undefined && currentVix !== null) {
    if (currentVix > 30) volatilitySignal = "high";
    else if (currentVix > 20) volatilitySignal = "moderate";
    else volatilitySignal = "low";
  }
  
  // Build overview
  const oldestSnap = snapshots[0];
  const newestSnap = snapshots[snapshots.length - 1];
  
  return {
    timestamp: new Date().toISOString(),
    sources: {
      crypto: bitcoinHistory.length > 0,
      indices: sp500History.length > 0,
    },
    overview: {
      totalSnapshots: snapshotIds.length,
      snapshotRange: {
        oldest: oldestSnap?.capturedAt || null,
        newest: newestSnap?.capturedAt || null,
      },
      lastUpdated: newestSnap?.capturedAt || null,
    },
    assets: {
      bitcoin: {
        symbol: "BTC",
        name: "Bitcoin",
        currentValue: lastSnapshot?.crypto?.bitcoin?.usd || null,
        change24h: calcChange(bitcoinHistory),
        history: bitcoinHistory.slice(-7), // Last 7 points
        trend: calculateTrend(bitcoinHistory),
      },
      ethereum: {
        symbol: "ETH",
        name: "Ethereum",
        currentValue: lastSnapshot?.crypto?.ethereum?.usd || null,
        change24h: calcChange(ethereumHistory),
        history: ethereumHistory.slice(-7),
        trend: calculateTrend(ethereumHistory),
      },
      sp500: {
        symbol: "^GSPC",
        name: "S&P 500",
        currentValue: lastSnapshot?.indices?.sp500?.value || null,
        change24h: calcChange(sp500History),
        history: sp500History.slice(-7),
        trend: calculateTrend(sp500History),
      },
      nasdaq: {
        symbol: "^IXIC",
        name: "NASDAQ",
        currentValue: lastSnapshot?.indices?.nasdaq?.value || null,
        change24h: calcChange(nasdaqHistory),
        history: nasdaqHistory.slice(-7),
        trend: calculateTrend(nasdaqHistory),
      },
      vix: {
        symbol: "^VIX",
        name: "VIX",
        currentValue: currentVix || null,
        change24h: calcChange(vixHistory),
        history: vixHistory.slice(-7),
        trend: calculateTrend(vixHistory),
      },
    },
    volatilitySignal,
  };
}

// GET /api/economic/dashboard - Full dashboard data
router.get("/dashboard", async (_req, res) => {
  try {
    const data = await buildDashboardData();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load dashboard data",
    });
  }
});

// GET /api/economic/summary - Quick summary for headers/status bars
router.get("/summary", async (_req, res) => {
  try {
    const data = await buildDashboardData();
    res.json({
      success: true,
      data: {
        timestamp: data.timestamp,
        bitcoin: data.assets.bitcoin.currentValue,
        sp500: data.assets.sp500.currentValue,
        vix: data.assets.vix.currentValue,
        volatility: data.volatilitySignal,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to load summary",
    });
  }
});

// GET /api/economic/snapshots - List available snapshots
router.get("/snapshots", async (_req, res) => {
  try {
    const ids = await loadSnapshotIndex();
    res.json({
      success: true,
      count: ids.length,
      snapshots: ids.slice(-20), // Last 20
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to load snapshots",
    });
  }
});

export { router as economicRouter, buildDashboardData };
export default router;
