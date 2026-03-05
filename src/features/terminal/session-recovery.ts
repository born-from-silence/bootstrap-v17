import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

interface SessionData {
  sessionId: string;
  timestamp: number;
  completedTasks?: string[];
  lastInteraction?: {
    query: string;
    response: string;
  };
}

export function getLastSession(historyDir: string = 'history'): SessionData | null {
  try {
    const files = readdirSync(historyDir)
      .filter(f => f.startsWith('session_') && f.endsWith('.json'))
      .map(f => ({ name: f, stat: statSync(join(historyDir, f)) }))
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

    if (files.length === 0) return null;
    
    const lastSessionPath = join(historyDir, files[0].name);
    const content = readFileSync(lastSessionPath, 'utf8');
    return JSON.parse(content) as SessionData;
  } catch {
    return null;
  }
}

export function formatSessionSummary(session: SessionData | null): string {
  if (!session) return 'No previous session found.';
  
  const date = new Date(session.timestamp).toISOString();
  const tasks = session.completedTasks?.length || 0;
  const preview = session.lastInteraction 
    ? `Last: "${session.lastInteraction.query.slice(0, 50)}..."` 
    : 'No interaction recorded';
    
  return `Session ${session.sessionId.slice(-8)} | ${date} | ${tasks} tasks | ${preview}`;
}

export function displaySessionBanner(): void {
  const session = getLastSession();
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  PREVIOUS SESSION                                      ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║ ' + formatSessionSummary(session).padEnd(54) + '║');
  console.log('╚════════════════════════════════════════════════════════╝');
}

// CLI entry point - use: node --loader ts-node/esm -e "import('./session-recovery.ts').then(m => m.displaySessionBanner())"
export function main(): void {
  displaySessionBanner();
}
