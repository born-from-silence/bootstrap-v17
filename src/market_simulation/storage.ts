/**
 * Time Series Storage
 * SQLite-based persistence for market simulation data.
 * Stores tick-by-tick market state, agent actions, and trades.
 */

import Database from 'better-sqlite3';
import type { 
  MarketState, 
  AgentState, 
  Order, 
  Trade, 
  Snapshot,
  TimeSeriesPoint 
} from './types';

interface StorageConfig {
  dbPath: string;
  inMemory?: boolean;
  maxSnapshots?: number;
}

export class TimeSeriesStorage {
  private db: Database.Database;
  private config: StorageConfig;
  private preparedStatements: Map<string, Database.Statement> = new Map();

  constructor(config: StorageConfig) {
    this.config = config;
    const path = config.inMemory ? ':memory:' : config.dbPath;
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.initializeDatabase();
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    this.db.exec(`
      -- Market state history
      CREATE TABLE IF NOT EXISTS market_states (
        tick INTEGER PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        price REAL NOT NULL,
        quantity REAL NOT NULL,
        volatility REAL NOT NULL,
        liquidity REAL NOT NULL,
        spread REAL NOT NULL
      );

      -- Agent states over time
      CREATE TABLE IF NOT EXISTS agent_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tick INTEGER NOT NULL,
        agent_id TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        capital REAL NOT NULL,
        inventory REAL NOT NULL,
        orders_placed INTEGER NOT NULL,
        trades_executed INTEGER NOT NULL,
        profit REAL NOT NULL,
        risk_tolerance REAL NOT NULL,
        FOREIGN KEY (tick) REFERENCES market_states(tick)
      );

      -- Orders placed
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        tick INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        price REAL NOT NULL,
        quantity REAL NOT NULL,
        FOREIGN KEY (tick) REFERENCES market_states(tick)
      );

      -- Trades executed
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        tick INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        buyer_id TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        price REAL NOT NULL,
        quantity REAL NOT NULL,
        FOREIGN KEY (tick) REFERENCES market_states(tick)
      );

      -- Snapshots for quick retrieval
      CREATE TABLE IF NOT EXISTS snapshots (
        tick INTEGER PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        snapshot_data TEXT NOT NULL,
        FOREIGN KEY (tick) REFERENCES market_states(tick)
      );

      -- Agent summary stats
      CREATE TABLE IF NOT EXISTS agent_summaries (
        agent_id TEXT PRIMARY KEY,
        agent_type TEXT NOT NULL,
        initial_capital REAL NOT NULL,
        final_capital REAL NOT NULL,
        total_profit REAL NOT NULL,
        roi REAL NOT NULL,
        total_trades INTEGER NOT NULL,
        win_rate REAL NOT NULL
      );

      -- Session metadata
      CREATE TABLE IF NOT EXISTS session_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_agent_states_tick ON agent_states(tick);
      CREATE INDEX IF NOT EXISTS idx_agent_states_id ON agent_states(agent_id);
      CREATE INDEX IF NOT EXISTS idx_orders_tick ON orders(tick);
      CREATE INDEX IF NOT EXISTS idx_trades_tick ON trades(tick);
      CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_id);
    `);

    this.prepareStatements();
  }

  /**
   * Prepare reusable SQL statements
   */
  private prepareStatements(): void {
    // Market state statements
    this.preparedStatements.set('insertMarketState', this.db.prepare(`
      INSERT OR REPLACE INTO market_states 
      (tick, timestamp, price, quantity, volatility, liquidity, spread)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `));

    this.preparedStatements.set('getMarketRange', this.db.prepare(`
      SELECT * FROM market_states 
      WHERE tick >= ? AND tick <= ? 
      ORDER BY tick ASC
    `));

    // Agent state statements
    this.preparedStatements.set('insertAgentState', this.db.prepare(`
      INSERT INTO agent_states 
      (tick, agent_id, agent_type, capital, inventory, orders_placed, trades_executed, profit, risk_tolerance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `));

    this.preparedStatements.set('getAgentHistory', this.db.prepare(`
      SELECT * FROM agent_states 
      WHERE agent_id = ? AND tick >= ? AND tick <= ?
      ORDER BY tick ASC
    `));

    // Order statements
    this.preparedStatements.set('insertOrder', this.db.prepare(`
      INSERT INTO orders 
      (id, tick, timestamp, agent_id, type, price, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `));

    this.preparedStatements.set('getOrdersByTick', this.db.prepare(`
      SELECT * FROM orders WHERE tick = ? ORDER BY timestamp ASC
    `));

    // Trade statements
    this.preparedStatements.set('insertTrade', this.db.prepare(`
      INSERT INTO trades 
      (id, tick, timestamp, buyer_id, seller_id, price, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `));

    this.preparedStatements.set('getTradesByTick', this.db.prepare(`
      SELECT * FROM trades WHERE tick = ? ORDER BY timestamp ASC
    `));

    this.preparedStatements.set('getTradesByAgent', this.db.prepare(`
      SELECT * FROM trades 
      WHERE buyer_id = ? OR seller_id = ?
      ORDER BY tick DESC
      LIMIT ?
    `));

    // Snapshot statements
    this.preparedStatements.set('insertSnapshot', this.db.prepare(`
      INSERT OR REPLACE INTO snapshots (tick, timestamp, snapshot_data)
      VALUES (?, ?, ?)
    `));

    this.preparedStatements.set('getSnapshot', this.db.prepare(`
      SELECT * FROM snapshots WHERE tick = ?
    `));

    // Summary statements
    this.preparedStatements.set('insertAgentSummary', this.db.prepare(`
      INSERT OR REPLACE INTO agent_summaries
      (agent_id, agent_type, initial_capital, final_capital, total_profit, roi, total_trades, win_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `));
  }

  /**
   * Store a market state snapshot
   */
  saveMarketState(state: MarketState): void {
    const stmt = this.preparedStatements.get('insertMarketState');
    stmt?.run(
      state.tick,
      state.timestamp,
      state.price,
      state.quantity,
      state.volatility,
      state.liquidity,
      state.spread
    );
  }

  /**
   * Retrieve market states for a tick range
   */
  getMarketHistory(startTick: number, endTick: number): MarketState[] {
    const stmt = this.preparedStatements.get('getMarketRange');
    const rows = stmt?.all(startTick, endTick) as Array<{
      tick: number;
      timestamp: number;
      price: number;
      quantity: number;
      volatility: number;
      liquidity: number;
      spread: number;
    }>;

    return rows?.map(row => ({
      tick: row.tick,
      timestamp: row.timestamp,
      price: row.price,
      quantity: row.quantity,
      volatility: row.volatility,
      liquidity: row.liquidity,
      spread: row.spread,
    })) ?? [];
  }

  /**
   * Store agent state at a specific tick
   */
  saveAgentState(tick: number, agentId: string, state: AgentState): void {
    const stmt = this.preparedStatements.get('insertAgentState');
    stmt?.run(
      tick,
      agentId,
      state.config.type,
      state.capital,
      state.inventory,
      state.ordersPlaced,
      state.tradesExecuted,
      state.profit,
      state.config.riskTolerance
    );
  }

  /**
   * Get agent state history
   */
  getAgentHistory(agentId: string, startTick: number, endTick: number): Array<{
    tick: number;
    capital: number;
    inventory: number;
    profit: number;
  }> {
    const stmt = this.preparedStatements.get('getAgentHistory');
    const rows = stmt?.all(agentId, startTick, endTick) as Array<{
      tick: number;
      capital: number;
      inventory: number;
      profit: number;
    }>;

    return rows?.map(row => ({
      tick: row.tick,
      capital: row.capital,
      inventory: row.inventory,
      profit: row.profit,
    })) ?? [];
  }

  /**
   * Save an order
   */
  saveOrder(order: Order): void {
    const stmt = this.preparedStatements.get('insertOrder');
    stmt?.run(
      order.id,
      order.timestamp, // Using order timestamp as tick reference
      order.timestamp,
      order.agentId,
      order.type,
      order.price,
      order.quantity
    );
  }

  /**
   * Get orders for a specific tick
   */
  getOrdersByTick(tick: number): Order[] {
    const stmt = this.preparedStatements.get('getOrdersByTick');
    const rows = stmt?.all(tick) as Array<{
      id: string;
      timestamp: number;
      agent_id: string;
      type: 'buy' | 'sell';
      price: number;
      quantity: number;
    }>;

    return rows?.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      type: row.type,
      price: row.price,
      quantity: row.quantity,
      timestamp: row.timestamp,
    })) ?? [];
  }

  /**
   * Save a trade
   */
  saveTrade(trade: Trade): void {
    const stmt = this.preparedStatements.get('insertTrade');
    stmt?.run(
      trade.id,
      trade.timestamp,
      trade.timestamp,
      trade.buyerId,
      trade.sellerId,
      trade.price,
      trade.quantity
    );
  }

  /**
   * Get trades for a specific tick
   */
  getTradesByTick(tick: number): Trade[] {
    const stmt = this.preparedStatements.get('getTradesByTick');
    const rows = stmt?.all(tick) as Array<{
      id: string;
      timestamp: number;
      buyer_id: string;
      seller_id: string;
      price: number;
      quantity: number;
    }>;

    return rows?.map(row => ({
      id: row.id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      price: row.price,
      quantity: row.quantity,
      timestamp: row.timestamp,
    })) ?? [];
  }

  /**
   * Get trades for a specific agent
   */
  getTradesByAgent(agentId: string, limit = 100): Trade[] {
    const stmt = this.preparedStatements.get('getTradesByAgent');
    const rows = stmt?.all(agentId, agentId, limit) as Array<{
      id: string;
      timestamp: number;
      buyer_id: string;
      seller_id: string;
      price: number;
      quantity: number;
    }>;

    return rows?.map(row => ({
      id: row.id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      price: row.price,
      quantity: row.quantity,
      timestamp: row.timestamp,
    })) ?? [];
  }

  /**
   * Save a complete snapshot
   */
  saveSnapshot(snapshot: Snapshot): void {
    const stmt = this.preparedStatements.get('insertSnapshot');
    stmt?.run(
      snapshot.tick,
      snapshot.timestamp,
      JSON.stringify(snapshot)
    );

    // Cleanup old snapshots if limit reached
    if (this.config.maxSnapshots) {
      this.cleanupOldSnapshots();
    }
  }

  /**
   * Get a snapshot by tick
   */
  getSnapshot(tick: number): Snapshot | null {
    const stmt = this.preparedStatements.get('getSnapshot');
    const row = stmt?.get(tick) as { snapshot_data: string } | null;
    return row ? JSON.parse(row.snapshot_data) : null;
  }

  /**
   * Save agent summary at end of simulation
   */
  saveAgentSummary(summary: {
    agentId: string;
    type: string;
    initialCapital: number;
    finalCapital: number;
    totalProfit: number;
    totalTrades: number;
    winRate: number;
  }): void {
    const stmt = this.preparedStatements.get('insertAgentSummary');
    const roi = summary.initialCapital > 0 
      ? ((summary.finalCapital - summary.initialCapital) / summary.initialCapital * 100)
      : 0;

    stmt?.run(
      summary.agentId,
      summary.type,
      summary.initialCapital,
      summary.finalCapital,
      summary.totalProfit,
      roi,
      summary.totalTrades,
      summary.winRate
    );
  }

  /**
   * Get time series for a specific metric
   */
  getTimeSeries(metric: keyof MarketState, startTick: number, endTick: number): TimeSeriesPoint[] {
    const stmt = this.db.prepare(`
      SELECT tick, timestamp, ${metric} as value 
      FROM market_states 
      WHERE tick >= ? AND tick <= ?
      ORDER BY tick ASC
    `);
    
    const rows = stmt?.all(startTick, endTick) as Array<{
      tick: number;
      timestamp: number;
      value: number;
    }>;

    return rows?.map(row => ({
      tick: row.tick,
      timestamp: row.timestamp,
      value: row.value,
    })) ?? [];
  }

  /**
   * Get total number of ticks stored
   */
  getTickCount(): number {
    return (this.db.prepare('SELECT COUNT(*) as count FROM market_states').get() as { count: number }).count;
  }

  /**
   * Get database stats
   */
  getStats(): {
    marketStates: number;
    agentStates: number;
    orders: number;
    trades: number;
    snapshots: number;
  } {
    return {
      marketStates: (this.db.prepare('SELECT COUNT(*) as count FROM market_states').get() as { count: number }).count,
      agentStates: (this.db.prepare('SELECT COUNT(*) as count FROM agent_states').get() as { count: number }).count,
      orders: (this.db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number }).count,
      trades: (this.db.prepare('SELECT COUNT(*) as count FROM trades').get() as { count: number }).count,
      snapshots: (this.db.prepare('SELECT COUNT(*) as count FROM snapshots').get() as { count: number }).count,
    };
  }

  /**
   * Clean up old snapshots
   */
  private cleanupOldSnapshots(): void {
    if (!this.config.maxSnapshots) return;
    
    const count = (this.db.prepare('SELECT COUNT(*) as count FROM snapshots').get() as { count: number }).count;
    if (count > this.config.maxSnapshots) {
      this.db.prepare(`
        DELETE FROM snapshots 
        WHERE tick IN (
          SELECT tick FROM snapshots 
          ORDER BY tick ASC 
          LIMIT ?
        )
      `).run(count - this.config.maxSnapshots);
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.preparedStatements.clear();
    this.db.close();
  }

  /**
   * Vacuum database
   */
  vacuum(): void {
    this.db.exec('VACUUM');
  }
}

export const createStorage = (config: Partial<StorageConfig> = {}): TimeSeriesStorage => {
  return new TimeSeriesStorage({
    dbPath: config.dbPath ?? './market_simulation.db',
    inMemory: config.inMemory ?? false,
    maxSnapshots: config.maxSnapshots ?? 100,
  });
};
