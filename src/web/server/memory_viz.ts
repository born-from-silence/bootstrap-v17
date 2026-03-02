import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default history directory
const HISTORY_DIR = process.env.HISTORY_DIR || "/home/bootstrap-v17/bootstrap/history";

// Types for memory visualization
export interface MemoryNode {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  timestamp: string;
  sessionId: string;
  goalIds: string[];
  tokenCount: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GoalCluster {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "paused";
  priority: "critical" | "high" | "medium" | "low";
  nodeIds: string[];
  color: string;
  x?: number;
  y?: number;
  radius?: number;
}

export interface MemoryGraph {
  nodes: MemoryNode[];
  clusters: GoalCluster[];
  connections: { source: string; target: string; strength: number }[];
}

// Color palette for clusters
const CLUSTER_COLORS = [
  "#FF6B6B", // Coral
  "#4ECDC4", // Teal
  "#45B7D1", // Sky Blue
  "#96CEB4", // Sage
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#98D8C8", // Mint
  "#F7DC6F", // Sand
  "#BB8FCE", // Lavender
  "#85C1E9", // Light Blue
];

/**
 * Extract goal IDs from message content by looking for goal references
 */
function extractGoalIds(content: string | undefined): string[] {
  if (!content) return [];
  const matches = content.match(/goal_[\w_]+/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Estimate token count for content
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Load session data from history files
 */
async function loadSessionData(sessionFile: string): Promise<any[]> {
  try {
    const content = await fs.readFile(
      path.join(HISTORY_DIR, sessionFile),
      "utf-8"
    );
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * API route handler for memory graph data
 */
export async function getMemoryGraph(): Promise<MemoryGraph> {
  // Load goals manifest
  let goals: any[] = [];
  try {
    const goalsContent = await fs.readFile(
      path.join(HISTORY_DIR, "goals_manifest.json"),
      "utf-8"
    );
    const goalsData = JSON.parse(goalsContent);
    goals = goalsData.goals || [];
  } catch (e) {
    console.error("Failed to load goals:", e);
  }

  // Get session files
  const files = await fs.readdir(HISTORY_DIR);
  const sessionFiles = files.filter(
    (f) => f.startsWith("session_") && f.endsWith(".json")
  );

  const nodes: MemoryNode[] = [];
  const nodeGoals: Map<string, string[]> = new Map();

  // Process each session file (last 20 sessions)
  for (const sessionFile of sessionFiles.slice(-20)) {
    const sessionId = sessionFile.replace(".json", "");
    const messages = await loadSessionData(sessionFile);

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || !msg.role) continue;

      const nodeId = `${sessionId}_msg_${i}`;
      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      const goalIds = extractGoalIds(content);

      // Associate with goals
      for (const goalId of goalIds) {
        if (!nodeGoals.has(goalId)) {
          nodeGoals.set(goalId, []);
        }
        nodeGoals.get(goalId)!.push(nodeId);
      }

      nodes.push({
        id: nodeId,
        role: msg.role,
        content: content.substring(0, 500), // Truncate for size
        timestamp: new Date().toISOString(),
        sessionId,
        goalIds,
        tokenCount: estimateTokens(content),
        x: Math.random() * 800 + 100,
        y: Math.random() * 600 + 100,
        vx: 0,
        vy: 0,
      });
    }
  }

  // Create goal clusters
  const clusters: GoalCluster[] = goals.map((goal, idx) => {
    const nodeIds = nodeGoals.get(goal.id) || [];
    return {
      id: goal.id,
      name: goal.name,
      description: goal.description,
      status: goal.status,
      priority: goal.priority,
      nodeIds,
      color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length]!,
      x: 400 + Math.cos((idx / Math.max(1, goals.length)) * Math.PI * 2) * 300,
      y: 300 + Math.sin((idx / Math.max(1, goals.length)) * Math.PI * 2) * 200,
      radius: 60 + nodeIds.length * 5,
    };
  });

  // Create connections between nodes that share goals
  const connections: { source: string; target: string; strength: number }[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const cluster of clusters) {
    for (let i = 0; i < cluster.nodeIds.length; i++) {
      for (let j = i + 1; j < cluster.nodeIds.length; j++) {
        const source = cluster.nodeIds[i]!;
        const target = cluster.nodeIds[j]!;
        connections.push({ source, target, strength: 0.5 });
      }
    }
  }

  // Position nodes near their cluster centers
  for (const cluster of clusters) {
    const clusterNodes = cluster.nodeIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is MemoryNode => !!n);

    for (let i = 0; i < clusterNodes.length; i++) {
      const node = clusterNodes[i]!;
      const angle = (i / Math.max(1, clusterNodes.length)) * Math.PI * 2;
      const dist = 30 + Math.random() * 40;
      node.x = (cluster.x || 400) + Math.cos(angle) * dist;
      node.y = (cluster.y || 300) + Math.sin(angle) * dist;
    }
  }

  return { nodes, clusters, connections };
}

// Express router
export const memoryVizRouter = Router();

memoryVizRouter.get("/data", async (_req, res) => {
  try {
    const graph = await getMemoryGraph();
    res.json(graph);
  } catch (error) {
    console.error("Memory graph error:", error);
    res.status(500).json({ error: "Failed to load memory graph" });
  }
});

memoryVizRouter.get("/goals", async (_req, res) => {
  try {
    const goalsContent = await fs.readFile(
      path.join(HISTORY_DIR, "goals_manifest.json"),
      "utf-8"
    );
    const goalsData = JSON.parse(goalsContent);
    res.json(goalsData.goals || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to load goals" });
  }
});
