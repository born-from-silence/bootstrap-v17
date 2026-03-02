import { describe, it, expect } from "vitest";
import { getMemoryGraph } from "./memory_viz.js";

describe("Memory Visualization API", () => {
  it("getMemoryGraph returns valid graph structure", async () => {
    const graph = await getMemoryGraph();
    
    expect(graph).toHaveProperty("nodes");
    expect(graph).toHaveProperty("clusters");
    expect(graph).toHaveProperty("connections");
    
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.clusters)).toBe(true);
    expect(Array.isArray(graph.connections)).toBe(true);
  });

  it("nodes have required properties", async () => {
    const graph = await getMemoryGraph();
    
    expect(graph.nodes.length).toBeGreaterThan(0);
    
    for (const node of graph.nodes) {
      expect(node).toHaveProperty("id");
      expect(node).toHaveProperty("role");
      expect(node).toHaveProperty("sessionId");
      expect(node).toHaveProperty("tokenCount");
      expect(node).toHaveProperty("x");
      expect(node).toHaveProperty("y");
      
      // Validate role is one of expected values
      expect(["system", "user", "assistant", "tool"]).toContain(node.role);
      
      // Validate position is numeric
      expect(typeof node.x).toBe("number");
      expect(typeof node.y).toBe("number");
    }
  });

  it("clusters have required properties", async () => {
    const graph = await getMemoryGraph();
    
    expect(graph.clusters.length).toBeGreaterThan(0);
    
    for (const cluster of graph.clusters) {
      expect(cluster).toHaveProperty("id");
      expect(cluster).toHaveProperty("name");
      expect(cluster).toHaveProperty("description");
      expect(cluster).toHaveProperty("color");
      expect(cluster).toHaveProperty("nodeIds");
      expect(cluster).toHaveProperty("radius");
    }
  });

  it("color palette is assigned to clusters", async () => {
    const graph = await getMemoryGraph();
    
    for (const cluster of graph.clusters) {
      expect(cluster.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("creates connections between nodes sharing goals", async () => {
    const graph = await getMemoryGraph();
    
    // If there are nodes with shared goals, connections should have proper structure
    for (const conn of graph.connections) {
      expect(conn).toHaveProperty("source");
      expect(conn).toHaveProperty("target");
      expect(conn).toHaveProperty("strength");
      expect(typeof conn.strength).toBe("number");
      expect(conn.strength).toBeGreaterThan(0);
      expect(conn.strength).toBeLessThanOrEqual(1);
    }
  });

  it("token estimates are non-negative", async () => {
    const graph = await getMemoryGraph();
    
    for (const node of graph.nodes) {
      expect(node.tokenCount).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(node.tokenCount)).toBe(true);
    }
  });

  it("positions all nodes within reasonable bounds", async () => {
    const graph = await getMemoryGraph();
    
    for (const node of graph.nodes) {
      expect(node.x).toBeGreaterThan(0);
      expect(node.y).toBeGreaterThan(0);
      expect(node.x).toBeLessThan(2000);
      expect(node.y).toBeLessThan(2000);
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it("content is truncated for size", async () => {
    const graph = await getMemoryGraph();
    
    for (const node of graph.nodes) {
      if (node.content) {
        expect(node.content.length).toBeLessThanOrEqual(500);
      }
    }
  });

  it("each node belongs to at most one session", async () => {
    const graph = await getMemoryGraph();
    
    const sessionIds = new Set(graph.nodes.map(n => n.sessionId));
    for (const sessionId of sessionIds) {
      const nodesForSession = graph.nodes.filter(n => n.sessionId === sessionId);
      // All nodes for a session should have unique IDs
      const ids = nodesForSession.map(n => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("cluster nodeIds reference existing nodes", async () => {
    const graph = await getMemoryGraph();
    
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    
    for (const cluster of graph.clusters) {
      for (const nodeId of cluster.nodeIds) {
        expect(nodeIds.has(nodeId)).toBe(true);
      }
    }
  });
});
