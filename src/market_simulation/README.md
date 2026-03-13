# Market Simulation System

A multi-agent market simulation engine with event-driven architecture.

## Architecture

The system consists of several decoupled components communicating via an event bus:

```
┌─────────────────────────────────────────────────────────────┐
│                    MarketSimulation                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │Supplier │  │ Demand  │  │Arbitrage│  │ ExternalShock   │ │
│  │ Agent   │  │ Agent   │  │ Agent   │  │ Agent         │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘ │
│       │            │            │                 │          │
│       └────────────┴────────────┴─────────────────┘          │
│                     │                                         │
│                     ▼                                         │
│              ┌─────────────┐                                  │
│              │  EventBus   │◄────── Event-driven comm          │
│              └──────┬──────┘                                  │
│                     │                                         │
│       ┌─────────────┴──────────────────┐                      │
│       │                                 │                     │
│       ▼                                 ▼                     │
│  ┌─────────────┐              ┌─────────────────┐             │
│  │MatchingEng  │              │ TimeSeriesStorage│             │
│  │ Orders ↔ Trades│         │ SQLite persistence│            │
│  └─────────────┘              └─────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Agent Types

### SupplierAgent
Producer/seller behavior modeled on supply curves:
- Higher prices → more willing to sell (supply elasticity)
- Inventory management with cost basis tracking
- Configurable minimum sell price

### DemandAgent
Consumer/buyer behavior modeled on demand curves:
- Lower prices → more willing to buy (demand elasticity)
- Satisfaction tracking that decays over time
- Budget constraints and maximum buy price

### ArbitrageurAgent
Detects and exploits price discrepancies:
- Tracks price history across multiple "markets"
- Positions held for configurable periods
- Profit-taking when discrepancies close

### ExternalShockAgent
Simulates exogenous market events:
- Supply shocks (production disruptions)
- Demand shocks (sentiment shifts)
- Liquidity shocks (credit conditions)
- Volatility shocks (uncertainty spikes)

## Key Features

### Event-Driven Architecture
- Decoupled components via EventBus
- Subscription-based event filtering
- Metrics and history tracking
- Once-only and wait-for-event patterns

### Matching Engine
- Price-time priority for orders
- Partial fill support
- Order book depth calculation
- Bid-ask spread tracking

### Statistics Module
- Mean, median, stdDev, skewness, kurtosis
- Linear regression with R²
- Rolling and exponential moving averages
- Bollinger bands
- Returns and volatility calculations
- Max drawdown analysis
- RSI, autocorrelation, correlation

### Persistence
SQLite-backed storage for:
- Market states per tick
- Agent states and summaries
- Orders and trades
- Snapshots for time-series analysis

## Usage

### Basic Simulation
```typescript
const sim = new MarketSimulation({
  ticks: 100,
  initialPrice: 100,
  shockProbability: 0.05,
});

sim.addSupplier({ riskTolerance: 0.6 });
sim.addDemand({ riskTolerance: 0.6 });
sim.addArbitrageur({ riskTolerance: 0.8 });
sim.addShockAgent({ riskTolerance: 1.0 });

const report = await sim.run();
```

### CLI
```bash
npx tsx src/market_simulation/cli.ts --ticks 200 --suppliers 5 --demands 5
```

### Event Subscription
```typescript
sim.getEventBus().subscribe('PRICE_UPDATE', (event) => {
  console.log(`Price: ${event.payload.newPrice}`);
});
```

## Test Coverage

32 comprehensive tests covering:
- EventBus publish/subscribe/filter/wait patterns
- Storage persistence and retrieval
- MatchingEngine price priority and partial fills
- Agent decision logic for all agent types
- Statistical calculations
- Full simulation runs

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| ticks | 100 | Simulation duration |
| initialPrice | 100 | Starting market price |
| initialQuantity | 1000 | Starting market quantity |
| maxPrice | 500 | Maximum allowed price |
| minPrice | 10 | Minimum allowed price |
| shockProbability | 0.05 | Probability of external shock per tick |
