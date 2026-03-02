/**
 * Memory Nexus - Interactive Particle Visualization
 * 
 * Features:
 * - Particle system representing memory nodes
 * - Force-directed layout with goal clusters
 * - Interactive selection and browsing
 * - Canvas-based rendering with WebGL-like effects
 */

// Type definitions
interface MemoryNode {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  timestamp: string;
  sessionId: string;
  goalIds: string[];
  tokenCount: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  hovered: boolean;
  selected: boolean;
}

interface GoalCluster {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "paused";
  priority: "critical" | "high" | "medium" | "low";
  nodeIds: string[];
  color: string;
  x: number;
  y: number;
  radius: number;
}

interface Connection {
  source: string;
  target: string;
  strength: number;
}

interface MemoryGraph {
  nodes: MemoryNode[];
  clusters: GoalCluster[];
  connections: Connection[];
}

// Configuration
const CONFIG = {
  NODE_RADIUS: { system: 8, user: 12, assistant: 12, tool: 6 },
  NODE_COLORS: {
    system: "#FFEAA7",
    user: "#45B7D1",
    assistant: "#FF6B6B",
    tool: "#96CEB4",
  },
  FORCE_STRENGTH: {
    repulsion: 1500,
    attraction: 0.05,
    cluster: 0.8,
    connection: 0.3,
    center: 0.01,
  },
  DRAG: 0.92,
  MAX_VELOCITY: 8,
  PARTICLE_ALPHA: 0.7,
  CONNECTION_ALPHA: 0.3,
  HOVER_SCALE: 1.3,
  UPDATE_DELTA: 16,
};

class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nodes: Map<string, MemoryNode> = new Map();
  private clusters: Map<string, GoalCluster> = new Map();
  private connections: Connection[] = [];
  private particles: Particle[] = [];
  private animationId: number | null = null;
  private isPaused = false;
  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private mouseX = 0;
  private mouseY = 0;
  private hoveredNode: MemoryNode | null = null;
  private selectedNode: MemoryNode | null = null;
  private draggedNode: MemoryNode | null = null;
  private lastTime = 0;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    
    this.setupCanvas();
    this.setupEventListeners();
    this.start();
  }

  private setupCanvas() {
    const resize = () => {
      const rect = this.canvas.parentElement!.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);
  }

  private setupEventListeners() {
    // Mouse handling
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) / this.zoom - this.panX;
      this.mouseY = (e.clientY - rect.top) / this.zoom - this.panY;
      
      if (this.draggedNode) {
        this.draggedNode.x = this.mouseX;
        this.draggedNode.y = this.mouseY;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
      } else {
        this.updateHover();
      }
    });

    this.canvas.addEventListener("mousedown", (e) => {
      if (this.hoveredNode) {
        this.draggedNode = this.hoveredNode;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
      }
    });

    this.canvas.addEventListener("mouseup", () => {
      if (this.draggedNode && this.draggedNode === this.hoveredNode) {
        this.selectNode(this.draggedNode);
      }
      this.draggedNode = null;
    });

    this.canvas.addEventListener("click", (e) => {
      if (e.detail === 2 && this.hoveredNode) {
        // Double click - show full content
        this.showDetailPanel(this.hoveredNode);
      }
    });

    // Wheel for zoom
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom *= scale;
      this.zoom = Math.max(0.1, Math.min(5, this.zoom));
    });
  }

  private updateHover() {
    let closest: MemoryNode | null = null;
    let minDist = Infinity;

    for (const node of this.nodes.values()) {
      const dx = this.mouseX - node.x;
      const dy = this.mouseY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < node.radius * CONFIG.HOVER_SCALE && dist < minDist) {
        minDist = dist;
        closest = node;
      }
    }

    if (closest !== this.hoveredNode) {
      if (this.hoveredNode) this.hoveredNode.hovered = false;
      if (closest) closest.hovered = true;
      this.hoveredNode = closest;
      
      // Update tooltip
      const tooltip = document.getElementById("tooltip")!;
      if (closest) {
        tooltip.textContent = `${closest.role}: ${closest.content?.substring(0, 100)}...`;
        tooltip.style.left = `${this.mouseX * this.zoom + this.panX + 20}px`;
        tooltip.style.top = `${this.mouseY * this.zoom + this.panY + 20}px`;
        tooltip.classList.add("visible");
      } else {
        tooltip.classList.remove("visible");
      }
    }
  }

  private selectNode(node: MemoryNode) {
    if (this.selectedNode) this.selectedNode.selected = false;
    this.selectedNode = node;
    node.selected = true;
    this.showDetailPanel(node);
  }

  private showDetailPanel(node: MemoryNode) {
    const panel = document.getElementById("detail-panel")!;
    const content = document.getElementById("detail-content")!;
    
    content.textContent = node.content || "(No content)";
    document.getElementById("meta-role")!.textContent = node.role;
    document.getElementById("meta-session")!.textContent = node.sessionId;
    document.getElementById("meta-tokens")!.textContent = `${node.tokenCount}`;
    document.getElementById("meta-goals")!.textContent = node.goalIds.join(", ") || "None";
    
    panel.classList.add("open");
  }

  loadGraph(graph: MemoryGraph) {
    this.nodes.clear();
    this.clusters.clear();
    this.connections = graph.connections;
    this.particles = [];

    // Initialize nodes
    for (const nodeData of graph.nodes) {
      const node: MemoryNode = {
        ...nodeData,
        x: nodeData.x || Math.random() * 800 + 100,
        y: nodeData.y || Math.random() * 600 + 100,
        vx: 0,
        vy: 0,
        radius: CONFIG.NODE_RADIUS[nodeData.role],
        color: CONFIG.NODE_COLORS[nodeData.role],
        alpha: CONFIG.PARTICLE_ALPHA,
        hovered: false,
        selected: false,
      };
      this.nodes.set(node.id, node);

      // Create trailing particles for visual effect
      for (let i = 0; i < 3; i++) {
        this.particles.push(new Particle(node.x, node.y, node.color));
      }
    }

    // Initialize clusters
    for (const clusterData of graph.clusters) {
      this.clusters.set(clusterData.id, clusterData);
    }

    // Update stats
    document.getElementById("stat-nodes")!.textContent = String(this.nodes.size);
    document.getElementById("stat-clusters")!.textContent = String(this.clusters.size);
    document.getElementById("stat-connections")!.textContent = String(this.connections.length);

    // Build legend
    this.buildLegend();
  }

  private buildLegend() {
    const container = document.getElementById("legend-container")!;
    container.innerHTML = "";

    for (const cluster of this.clusters.values()) {
      const item = document.createElement("div");
      item.className = "legend-item";
      item.innerHTML = `
        <div class="legend-color" style="background: ${cluster.color}"></div>
        <span>${cluster.name}</span>
      `;
      item.addEventListener("click", () => this.focusCluster(cluster));
      container.appendChild(item);
    }
  }

  private focusCluster(cluster: GoalCluster) {
    // Center view on cluster
    const canvasRect = this.canvas.getBoundingClientRect();
    this.panX = canvasRect.width / 2 - cluster.x * this.zoom;
    this.panY = canvasRect.height / 2 - cluster.y * this.zoom;
  }

  private updatePhysics(deltaTime: number) {
    if (this.isPaused) return;

    const dt = Math.min(deltaTime / 16, 2); // Normalize to ~60fps

    for (const node of this.nodes.values()) {
      if (node === this.draggedNode) continue;

      let fx = 0;
      let fy = 0;

      // Repulsion from other nodes
      for (const other of this.nodes.values()) {
        if (other === node) continue;
        
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0 && dist < 200) {
          const force = CONFIG.FORCE_STRENGTH.repulsion / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
      }

      // Attraction to cluster center
      for (const goalId of node.goalIds) {
        const cluster = this.clusters.get(goalId);
        if (cluster) {
          const dx = cluster.x - node.x;
          const dy = cluster.y - node.y;
          fx += dx * CONFIG.FORCE_STRENGTH.cluster * 0.1;
          fy += dy * CONFIG.FORCE_STRENGTH.cluster * 0.1;
        }
      }

      // Connection attraction
      for (const conn of this.connections) {
        if (conn.source === node.id || conn.target === node.id) {
          const otherId = conn.source === node.id ? conn.target : conn.source;
          const other = this.nodes.get(otherId);
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            fx += dx * CONFIG.FORCE_STRENGTH.connection * conn.strength;
            fy += dy * CONFIG.FORCE_STRENGTH.connection * conn.strength;
          }
        }
      }

      // Centering force
      const canvasRect = this.canvas.getBoundingClientRect();
      const cx = canvasRect.width / 2;
      const cy = canvasRect.height / 2;
      fx += (cx - node.x) * CONFIG.FORCE_STRENGTH.center;
      fy += (cy - node.y) * CONFIG.FORCE_STRENGTH.center;

      // Apply force
      node.vx += fx * dt;
      node.vy += fy * dt;

      // Drag
      node.vx *= CONFIG.DRAG;
      node.vy *= CONFIG.DRAG;

      // Max velocity
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > CONFIG.MAX_VELOCITY) {
        node.vx = (node.vx / speed) * CONFIG.MAX_VELOCITY;
        node.vy = (node.vy / speed) * CONFIG.MAX_VELOCITY;
      }

      // Update position
      node.x += node.vx * dt;
      node.y += node.vy * dt;
    }

    // Update particles
    for (const particle of this.particles) {
      particle.update();
    }
  }

  private draw() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);
    
    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);

    // Draw cluster halos
    for (const cluster of this.clusters.values()) {
      const gradient = this.ctx.createRadialGradient(
        cluster.x, cluster.y, 0,
        cluster.x, cluster.y, cluster.radius * 2
      );
      gradient.addColorStop(0, cluster.color + "20");
      gradient.addColorStop(1, "transparent");
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(cluster.x, cluster.y, cluster.radius * 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw cluster label
      this.ctx.fillStyle = "#888";
      this.ctx.font = "10px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText(cluster.name, cluster.x, cluster.y - cluster.radius * 2 - 10);
    }

    // Draw connections
    this.ctx.strokeStyle = "rgba(78, 205, 196, 0.1)";
    this.ctx.lineWidth = 1;
    
    for (const conn of this.connections) {
      const source = this.nodes.get(conn.source);
      const target = this.nodes.get(conn.target);
      if (source && target) {
        this.ctx.beginPath();
        this.ctx.moveTo(source.x, source.y);
        this.ctx.lineTo(target.x, target.y);
        this.ctx.stroke();
      }
    }

    // Draw particles (trails)
    for (const particle of this.particles) {
      particle.draw(this.ctx);
    }

    // Draw nodes
    for (const node of this.nodes.values()) {
      const scale = node.hovered ? CONFIG.HOVER_SCALE : (node.selected ? 1.2 : 1);
      const radius = node.radius * scale;

      // Glow effect for selected/hovered
      if (node.hovered || node.selected) {
        const glowGradient = this.ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, radius * 3
        );
        glowGradient.addColorStop(0, node.color + "60");
        glowGradient.addColorStop(1, "transparent");
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, radius * 3, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Node body
      this.ctx.fillStyle = node.color + Math.floor(node.alpha * 255).toString(16).padStart(2, "0");
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Inner highlight
      const innerGradient = this.ctx.createRadialGradient(
        node.x - radius * 0.3, node.y - radius * 0.3, 0,
        node.x, node.y, radius
      );
      innerGradient.addColorStop(0, "rgba(255,255,255,0.6)");
      innerGradient.addColorStop(1, "transparent");
      
      this.ctx.fillStyle = innerGradient;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private animate = (timestamp: number) => {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.updatePhysics(deltaTime);
    this.draw();

    this.animationId = requestAnimationFrame(this.animate);
  };

  start() {
    if (!this.animationId) {
      this.lastTime = performance.now();
      this.animationId = requestAnimationFrame(this.animate);
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  reset() {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    // Re-randomize positions
    for (const node of this.nodes.values()) {
      node.x = Math.random() * 800 + 100;
      node.y = Math.random() * 600 + 100;
      node.vx = 0;
      node.vy = 0;
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  zoomIn() {
    this.zoom *= 1.2;
  }

  zoomOut() {
    this.zoom /= 1.2;
  }
}

// Particle for visual effects
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.life = 1;
    this.maxLife = 30 + Math.random() * 30;
    this.color = color;
    this.size = 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 1 / this.maxLife;
    if (this.life < 0) this.life = 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;
    ctx.fillStyle = this.color + Math.floor(this.life * 40).toString(16).padStart(2, "0");
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Global instance
let system: ParticleSystem | null = null;

// Initialize
async function init() {
  try {
    system = new ParticleSystem("particle-canvas");
    
    // Load data
    const response = await fetch("/api/memory/data");
    if (!response.ok) throw new Error("Failed to load memory data");
    
    const graph = await response.json();
    system.loadGraph(graph);
    
    // Hide loading
    document.getElementById("loading")!.style.display = "none";
  } catch (error) {
    console.error("Initialization error:", error);
    document.querySelector(".loading-text")!.textContent = "Error loading visualization";
  }
}

// UI Controls
(window as any).closeDetail = () => {
  document.getElementById("detail-panel")!.classList.remove("open");
  if (system) {
    for (const node of system["nodes"].values()) {
      node.selected = false;
    }
  }
};

(window as any).resetView = () => {
  if (system) system.reset();
};

(window as any).togglePause = () => {
  if (system) system.togglePause();
};

(window as any).zoomIn = () => {
  if (system) system.zoomIn();
};

(window as any).zoomOut = () => {
  if (system) system.zoomOut();
};

// Start
init();
