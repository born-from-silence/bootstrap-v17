/**
 * Semantic Pathfinder for Memory Palace
 * 
 * Navigate by meaning, not just coordinates.
 * Discover paths through the palace using semantic similarity,
 * generating poetic descriptions of the journey.
 */

import type { PalaceRoom } from './MemoryPalace';

export interface SemanticEdge {
  from: string;
  to: string;
  weight: number; // 0-1, higher = more similar
  sharedConcepts: string[];
  connectionType: 'direct' | 'semantic' | 'thematic' | 'temporal';
}

export interface SemanticPath {
  rooms: PalaceRoom[];
  edges: SemanticEdge[];
  totalDistance: number;
  coherence: number; // How semantically coherent the path is
  poeticDescription: string;
}

export interface PathQuery {
  from: string;
  to: string;
  preferredMood?: PalaceRoom['texture']['mood'];
  avoidThemes?: string[];
  maxLength?: number;
}

export interface SemanticNode {
  room: PalaceRoom;
  edges: SemanticEdge[];
  visited: boolean;
  distance: number;
  previous: string | null;
}

export type SimilarityFunction = (a: string[], b: string[]) => number;

/**
 * Extract meaningful words from text
 */
export function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\W_]+/)
    .filter(w => w.length > 2 && !isStopWord(w));
}

/**
 * Common stop words to filter out
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was',
    'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new',
    'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'she', 'use', 'her', 'now'
  ]);
  return stopWords.has(word);
}

/**
 * Default similarity: Jaccard index on word sets
 */
export function jaccardSimilarity(a: string[], b: string[]): number {
  // Flatten arrays: extract words from each item
  const wordsA = a.flatMap(extractWords);
  const wordsB = b.flatMap(extractWords);
  
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / (union.size || 1);
}

/**
 * Cosine similarity for vector embeddings (placeholder)
 * In practice, would use actual embedding vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += (a[i] || 0) * (b[i] || 0);
    normA += (a[i] || 0) ** 2;
    normB += (b[i] || 0) ** 2;
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

export class SemanticPathfinder {
  private rooms: Map<string, PalaceRoom> = new Map();
  private edges: Map<string, SemanticEdge[]> = new Map();
  private similarityFn: SimilarityFunction;

  constructor(similarityFn: SimilarityFunction = jaccardSimilarity) {
    this.similarityFn = similarityFn;
  }

  /**
   * Load rooms from a Memory Palace
   */
  loadRooms(rooms: PalaceRoom[]): void {
    for (const room of rooms) {
      this.rooms.set(room.id, room);
    }
    this.buildGraph();
  }

  /**
   * Build semantic graph from room contents
   */
  private buildGraph(): void {
    this.edges.clear();

    for (const [idA, roomA] of this.rooms) {
      const roomEdges: SemanticEdge[] = [];

      for (const [idB, roomB] of this.rooms) {
        if (idA === idB) continue;

        // Calculate semantic similarity from contents
        const contentA = [
          ...roomA.contents.insights,
          ...roomA.contents.artifacts,
          roomA.texture.mood,
        ];
        const contentB = [
          ...roomB.contents.insights,
          ...roomB.contents.artifacts,
          roomB.texture.mood,
        ];

        const similarity = this.similarityFn(contentA, contentB);

        if (similarity > 0.1) {
          const shared = this.findSharedConcepts(contentA, contentB);
          const edge: SemanticEdge = {
            from: idA,
            to: idB,
            weight: similarity,
            sharedConcepts: shared,
            connectionType: this.classifyConnection(roomA, roomB, similarity),
          };
          roomEdges.push(edge);
        }
      }

      // Sort by weight (descending)
      roomEdges.sort((a, b) => b.weight - a.weight);
      this.edges.set(idA, roomEdges);
    }
  }

  /**
   * Find shared concepts between two content arrays
   */
  private findSharedConcepts(a: string[], b: string[]): string[] {
    const wordsA = a.flatMap(extractWords);
    const wordsB = b.flatMap(extractWords);
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    return [...setA].filter(x => setB.has(x));
  }

  /**
   * Classify the type of connection between rooms
   */
  private classifyConnection(
    roomA: PalaceRoom,
    roomB: PalaceRoom,
    similarity: number
  ): SemanticEdge['connectionType'] {
    // Direct connection if rooms are already connected
    if (roomA.connections.includes(roomB.id)) return 'direct';

    // Thematic if same mood
    if (roomA.texture.mood === roomB.texture.mood) return 'thematic';

    // Temporal if close in time
    const timeDiff = Math.abs(roomA.coordinates.x - roomB.coordinates.x);
    if (timeDiff < 86400000) return 'temporal'; // Within 24 hours

    return 'semantic';
  }

  /**
   * Find path between two rooms using A* search
   */
  findPath(query: PathQuery): SemanticPath | null {
    const startRoom = this.rooms.get(query.from);
    const endRoom = this.rooms.get(query.to);

    if (!startRoom || !endRoom) return null;

    // A* implementation
    const openSet = new Set<string>([query.from]);
    const closedSet = new Set<string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFrom = new Map<string, string>();

    gScore.set(query.from, 0);
    fScore.set(query.from, this.heuristic(query.from, query.to));

    while (openSet.size > 0) {
      // Get node with lowest fScore
      let current = '';
      let lowestF = Infinity;
      for (const node of openSet) {
        const f = fScore.get(node) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          current = node;
        }
      }

      if (current === query.to) {
        return this.reconstructPath(cameFrom, current, query);
      }

      openSet.delete(current);
      closedSet.add(current);

      const neighbors = this.edges.get(current) || [];
      for (const edge of neighbors) {
        if (closedSet.has(edge.to)) continue;

        // Skip if room has avoided themes
        const room = this.rooms.get(edge.to);
        if (query.avoidThemes && room) {
          const hasAvoided = query.avoidThemes.some(theme =>
            room.contents.insights.some(i => i.includes(theme)) ||
            room.contents.artifacts.some(a => a.includes(theme))
          );
          if (hasAvoided) continue;
        }

        const tentativeGScore = (gScore.get(current) || 0) + (1 - edge.weight);

        if (!openSet.has(edge.to)) {
          openSet.add(edge.to);
        } else if (tentativeGScore >= (gScore.get(edge.to) || Infinity)) {
          continue;
        }

        cameFrom.set(edge.to, current);
        gScore.set(edge.to, tentativeGScore);
        fScore.set(edge.to, tentativeGScore + this.heuristic(edge.to, query.to));
      }
    }

    return null; // No path found
  }

  /**
   * Heuristic for A*: inverse of semantic similarity to goal
   */
  private heuristic(nodeId: string, goalId: string): number {
    const edges = this.edges.get(nodeId) || [];
    const edgeToGoal = edges.find(e => e.to === goalId);
    return edgeToGoal ? 1 - edgeToGoal.weight : 1;
  }

  /**
   * Reconstruct path from cameFrom map
   */
  private reconstructPath(
    cameFrom: Map<string, string>,
    current: string,
    query: PathQuery
  ): SemanticPath {
    const roomIds: string[] = [current];
    const pathEdges: SemanticEdge[] = [];

    while (cameFrom.has(current)) {
      const previous = cameFrom.get(current)!;
      roomIds.unshift(previous);
      
      // Find edge
      const edges = this.edges.get(previous) || [];
      const edge = edges.find(e => e.to === current);
      if (edge) pathEdges.unshift(edge);
      
      current = previous;
    }

    const rooms = roomIds.map(id => this.rooms.get(id)).filter((r): r is PalaceRoom => !!r);
    
    // Calculate coherence
    const coherence = this.calculateCoherence(pathEdges);
    
    // Generate poetic description
    const poeticDescription = this.generatePoeticPath(rooms, pathEdges);

    return {
      rooms,
      edges: pathEdges,
      totalDistance: roomIds.length,
      coherence,
      poeticDescription,
    };
  }

  /**
   * Calculate coherence of a path (how well-connected it is)
   */
  private calculateCoherence(edges: SemanticEdge[]): number {
    if (edges.length === 0) return 1;
    const totalWeight = edges.reduce((sum, e) => sum + e.weight, 0);
    return totalWeight / edges.length;
  }

  /**
   * Generate poetic description of a path
   */
  private generatePoeticPath(rooms: PalaceRoom[], edges: SemanticEdge[]): string {
    if (rooms.length === 0) return 'silence';
    if (rooms.length === 1) return `standing in ${this.roomName(rooms[0]!)}`;

    const lines: string[] = [];
    lines.push(`From ${this.roomName(rooms[0]!)}`);

    for (let i = 1; i < rooms.length; i++) {
      const edge = edges[i - 1];
      const room = rooms[i]!;
      
      if (edge && edge.sharedConcepts.length > 0) {
        const concept = edge.sharedConcepts[0];
        lines.push(`through ${concept} to ${this.roomName(room)}`);
      } else {
        lines.push(`to ${this.roomName(room)}`);
      }
    }

    // Add thematic summary
    const moods = [...new Set(rooms.map(r => r.texture.mood))];
    if (moods.length === 1) {
      lines.push(`a path of ${moods[0]}`);
    } else {
      lines.push(`threading ${moods.join(' into ')}`);
    }

    return lines.join(',\n');
  }

  /**
   * Get human-readable room name
   */
  private roomName(room: PalaceRoom): string {
    const firstInsight = room.contents.insights[0];
    if (firstInsight) {
      // Take first few words
      return firstInsight.split(' ').slice(0, 4).join(' ');
    }
    return room.id.replace('room_', 'session ');
  }

  /**
   * Discover hidden connections - rooms that should be connected
   * but aren't yet
   */
  discoverHiddenConnections(threshold = 0.7): SemanticEdge[] {
    const hidden: SemanticEdge[] = [];

    for (const [idA, roomA] of this.rooms) {
      const edges = this.edges.get(idA) || [];
      
      for (const edge of edges) {
        // If high semantic similarity but not directly connected
        if (edge.weight >= threshold && edge.connectionType !== 'direct') {
          // Check if not already directly connected
          if (!roomA.connections.includes(edge.to)) {
            hidden.push(edge);
          }
        }
      }
    }

    return hidden.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Get all edges for a room
   */
  getEdges(roomId: string): SemanticEdge[] {
    return this.edges.get(roomId) || [];
  }

  /**
   * Get path statistics
   */
  getStats(): {
    roomCount: number;
    edgeCount: number;
    averageConnectivity: number;
    strongestConnection: SemanticEdge | null;
  } {
    let edgeCount = 0;
    let strongest: SemanticEdge | null = null;

    for (const [, roomEdges] of this.edges) {
      edgeCount += roomEdges.length;
      for (const edge of roomEdges) {
        if (!strongest || edge.weight > strongest.weight) {
          strongest = edge;
        }
      }
    }

    const avgConnectivity = this.rooms.size > 0 ? edgeCount / this.rooms.size : 0;

    return {
      roomCount: this.rooms.size,
      edgeCount,
      averageConnectivity: avgConnectivity / 2, // Divide by 2 since edges are bidirectional
      strongestConnection: strongest,
    };
  }
}
