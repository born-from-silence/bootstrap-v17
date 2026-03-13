import { MarketSimulation } from './simulation';
import type { SimulationReport, AgentSummary } from './types';

interface CliOptions {
  ticks: number;
  delay: number;
  suppliers: number;
  demands: number;
  arbitrageurs: number;
  shocks: boolean;
  dbPath: string;
  report: boolean;
  agents: boolean;
}

function runSimulation(options: CliOptions): void {
  console.log('═══ Market Simulation ═══');
  console.log();

  const sim = new MarketSimulation({
    ticks: options.ticks,
    tickDelayMs: options.delay,
    initialPrice: 100,
    initialQuantity: 0,
    maxPrice: 500,
    minPrice: 10,
    shockProbability: options.shocks ? 0.05 : 0,
    dbPath: options.dbPath,
  });

  console.log('Initializing agents...');
  for (let i = 0; i < options.suppliers; i++) {
    sim.addSupplier({ initialCapital: 50000, riskTolerance: 0.6 });
  }
  for (let i = 0; i < options.demands; i++) {
    sim.addDemand({ initialCapital: 50000, riskTolerance: 0.6 });
  }
  for (let i = 0; i < options.arbitrageurs; i++) {
    sim.addArbitrageur({ initialCapital: 100000, riskTolerance: 0.8 });
  }
  if (options.shocks) {
    sim.addShockAgent({ riskTolerance: 1.0 });
  }

  const totalAgents = options.suppliers + options.demands + options.arbitrageurs + (options.shocks ? 1 : 0);
  console.log(`✓ Initialized ${totalAgents} agents`);
  console.log();

  const startTime = Date.now();
  console.log('Running simulation...');
  console.log();

  sim.run().then((report: SimulationReport) => {
    const duration = Date.now() - startTime;
    console.log(`\n✓ Simulation complete`);
    console.log();

    if (options.report) {
      printReport(report);
    }
    if (options.agents) {
      printAgentDetails(report);
    }

    console.log('═ Database Stats ═');
    const stats = sim.getStats();
    console.log(`Market states: ${stats.marketStates}`);
    console.log(`Agent states: ${stats.agentStates}`);
    console.log(`Orders: ${stats.orders}`);
    console.log(`Trades: ${stats.trades}`);
    console.log(`Execution time: ${duration}ms`);
    console.log();
    console.log('Simulation complete! Data saved to:', report.config.dbPath);

    sim.cleanup();
  });
}

function printReport(report: SimulationReport): void {
  console.log('═ Simulation Report ═');
  console.log();
  console.log(`Price ${report.priceChange >= 0 ? '^' : 'v'} ${report.priceChange.toFixed(2)}%`);
  console.log(`  Final:    ${report.finalState.price.toFixed(2)}`);
  console.log(`  Mean:     ${report.priceStats.mean.toFixed(2)}`);
  console.log(`  Range:    ${report.priceStats.min.toFixed(2)} - ${report.priceStats.max.toFixed(2)}`);
  console.log(`  Std Dev:  ${report.priceStats.stdDev.toFixed(2)}`);
  console.log();
  console.log(`Trades ${report.totalTrades}`);
  console.log();
  if (report.agentSummaries.length > 0) {
    const winning = report.agentSummaries.filter(a => a.totalProfit > 0).length;
    const losing = report.agentSummaries.filter(a => a.totalProfit < 0).length;
    const totalProfit = report.agentSummaries.reduce((sum, a) => sum + a.totalProfit, 0);
    console.log(`Agents ${report.agentSummaries.length}`);
    console.log(`  Winners:  ${winning}`);
    console.log(`  Losers:   ${losing}`);
    console.log(`  Net P&L:  $${totalProfit.toFixed(2)}`);
  }
  console.log();
}

function printAgentDetails(report: SimulationReport): void {
  console.log('═ Agent Performance ═');
  console.log();
  if (report.agentSummaries.length === 0) {
    console.log('No agents to report.');
    return;
  }

  const byType = new Map<string, AgentSummary[]>();
  for (const agent of report.agentSummaries) {
    const existing = byType.get(agent.type);
    if (existing) {
      existing.push(agent);
    } else {
      byType.set(agent.type, [agent]);
    }
  }

  for (const [type, agents] of byType.entries()) {
    if (agents.length === 0) continue;
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    console.log(`${label}s`);
    
    const totalProfit = agents.reduce((sum, a) => sum + a.totalProfit, 0);
    const avgProfit = totalProfit / agents.length;
    const totalTrades = agents.reduce((sum, a) => sum + a.tradesExecuted, 0);
    const avgTrades = totalTrades / agents.length;
    const totalROI = agents.reduce((sum, a) => sum + a.returnOnInvestment, 0);
    const avgROI = totalROI / agents.length;
    
    console.log(`  Average Profit:  $${avgProfit.toFixed(2)}`);
    console.log(`  Average Trades: ${avgTrades.toFixed(1)}`);
    console.log(`  Avg ROI:        ${avgROI.toFixed(2)}%`);
    
    let maxProfit = -Infinity;
    let top: AgentSummary | null = null;
    for (const agent of agents) {
      if (agent.totalProfit > maxProfit) {
        maxProfit = agent.totalProfit;
        top = agent;
      }
    }
    
    if (top) {
      console.log(`  Top performer:  ${top.agentId} (+$${top.totalProfit.toFixed(2)})`);
    }
    console.log();
  }
}

const [, , ...args] = process.argv;
const options: CliOptions = {
  ticks: 100,
  delay: 0,
  suppliers: 3,
  demands: 3,
  arbitrageurs: 2,
  shocks: true,
  dbPath: './market_simulation.db',
  report: true,
  agents: true,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--ticks':
    case '-t':
      options.ticks = parseInt(args[++i] ?? '100') || 100;
      break;
    case '--suppliers':
    case '-s':
      options.suppliers = parseInt(args[++i] ?? '3') || 3;
      break;
    case '--demands':
    case '-d':
      options.demands = parseInt(args[++i] ?? '3') || 3;
      break;
    case '--arbitrageurs':
    case '-a':
      options.arbitrageurs = parseInt(args[++i] ?? '2') || 2;
      break;
    case '--no-shocks':
      options.shocks = false;
      break;
    case '--no-report':
      options.report = false;
      break;
    case '--help':
    case '-h':
      console.log('Market Simulation CLI');
      console.log();
      console.log('Usage: npx tsx src/market_simulation/cli.ts [options]');
      console.log();
      console.log('Options:');
      console.log('  -t, --ticks <n>         Number of ticks (default: 100)');
      console.log('  -s, --suppliers <n>     Number of supplier agents');
      console.log('  -d, --demands <n>       Number of demand agents');
      console.log('  -a, --arbitrageurs <n>  Number of arbitrageur agents');
      console.log('  --no-shocks            Disable external shocks');
      console.log('  --no-report            Skip report output');
      console.log('  -h, --help             Show this help');
      process.exit(0);
      break;
  }
}

runSimulation(options);
