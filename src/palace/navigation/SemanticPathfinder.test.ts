import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticPathfinder, jaccardSimilarity, cosineSimilarity } from './SemanticPathfinder';
import type { PalaceRoom } from './MemoryPalace';

describe('SemanticPathfinder', () => {
  let pathfinder: SemanticPathfinder;

  beforeEach(() => {
    pathfinder = new SemanticPathfinder();
  });

  describe('Jaccard similarity', () => {
    it('should return 1 for identical sets', () => {
      const a = ['building', 'memory', 'palace'];
      const b = ['building', 'memory', 'palace'];
      expect(jaccardSimilarity(a, b)).toBe(1);
    });

    it('should return 0 for disjoint sets', () => {
      const a = ['one', 'two', 'three'];
      const b = ['four', 'five', 'six'];
      expect(jaccardSimilarity(a, b)).toBe(0);
    });

    it('should calculate partial overlap', () => {
      const a = ['building', 'memory', 'palace'];
      const b = ['building', 'memory', 'dream'];
      // intersection = 2, union = 4, similarity = 0.5
      expect(jaccardSimilarity(a, b)).toBe(0.5);
    });

    it('should be case insensitive', () => {
      const a = ['Building', 'Memory'];
      const b = ['building', 'memory'];
      expect(jaccardSimilarity(a, b)).toBe(1);
    });
  });

  describe('Cosine similarity', () => {
    it('should return 1 for identical vectors', () => {
      const a = [1, 0, 1, 0];
      const b = [1, 0, 1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('should calculate for vectors with different magnitudes', () => {
      const a = [1, 2, 3];
      const b = [2, 4, 6]; // Same direction
      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    });
  });

  describe('Loading rooms', () => {
    it('should load rooms and build graph', () => {
      const rooms: PalaceRoom[] = [
        {
          id: 'room_1',
          sessionRef: 'session_1',
          coordinates: { x: 1, y: 0, z: 0 },
          texture: { mood: 'flow', temperature: 'warm', density: 'medium' },
          contents: { insights: ['building memory palace'], artifacts: [], commits: [], tests: 0 },
          connections: [],
          visited: false,
        },
        {
          id: 'room_2',
          sessionRef: 'session_2',
          coordinates: { x: 2, y: 0, z: 0 },
          texture: { mood: 'discovery', temperature: 'warm', density: 'medium' },
          contents: { insights: ['memory palace structure'], artifacts: [], commits: [], tests: 0 },
          connections: [],
          visited: false,
        },
      ];

      pathfinder.loadRooms(rooms);
      const stats = pathfinder.getStats();
      expect(stats.roomCount).toBe(2);
      // Should have edges between rooms
      expect(stats.edgeCount).toBeGreaterThan(0);
    });

    it('should find semantic edges between similar rooms', () => {
      const rooms: PalaceRoom[] = [
        {
          id: 'room_1',
          sessionRef: 'session_1',
          coordinates: { x: 1, y: 0, z: 0 },
          texture: { mood: 'flow', temperature: 'warm', density: 'medium' },
          contents: { insights: ['building memory palace'], artifacts: [], commits: [], tests: 0 },
          connections: [],
          visited: false,
        },
        {
          id: 'room_2',
          sessionRef: 'session_2',
          coordinates: { x: 2, y: 0, z: 0 },
          texture: { mood: 'discovery', temperature: 'warm', density: 'medium' },
          contents: { insights: ['memory palace structure'], artifacts: [], commits: [], tests: 0 },
          connections: [],
          visited: false,
        },
      ];

      pathfinder.loadRooms(rooms);
      const edges = pathfinder.getEdges('room_1');
      expect(edges.length).toBeGreaterThan(0);
      expect(edges[0]!.to).toBe('room_2');
      expect(edges[0]!.sharedConcepts).toContain('memory');
      expect(edges[0]!.sharedConcepts).toContain('palace');
    });
  });

  describe('Pathfinding', () => {
    beforeEach(() => {
      const rooms: PalaceRoom[] = [
        {
          id: 'room_start',
          sessionRef: 'session_start',
          coordinates: { x: 1, y: 0, z: 0 },
          texture: { mood: 'flow', temperature: 'warm', density: 'medium' },
          contents: { insights: ['beginning the journey'], artifacts: [], commits: [], tests: 0 },
          connections: [],
          visited: true,
        },
        {
          id: 'room_middle',
          sessionRef: 'session_middle',
          coordinates: { x: 2, y: 0, z: 0 },
          texture: { mood: 'discovery', temperature: 'warm', density: 'medium' },
          contents: { insights: ['discovering the path'], artifacts: [], commits: [], tests: 0 },
          connections: ['room_start'],
          visited: true,
        },
        {
          id: 'room_end',
          sessionRef: 'session_end',
          coordinates: { x: 3, y: 0, z: 0 },
          texture: { mood: 'flow', temperature: 'warm', density: 'medium' },
          contents: { insights: ['reaching the destination'], artifacts: [], commits: [], tests: 0 },
          connections: ['room_middle'],
          visited: false,
        },
      ];

      pathfinder.loadRooms(rooms);
    });

    it('should find a path between rooms', () => {
      const path = pathfinder.findPath({ from: 'room_start', to: 'room_end' });
      expect(path).not.toBeNull();
      expect(path!.rooms.length).toBeGreaterThanOrEqual(2);
      expect(path!.rooms[0]!.id).toBe('room_start');
      expect(path!.rooms[path!.rooms.length - 1]!.id).toBe('room_end');
    });

    it('should return null for non-existent rooms', () => {
      const path = pathfinder.findPath({ from: 'nonexistent', to: 'room_end' });
      expect(path).toBeNull();
    });

    it('should calculate coherence of path', () => {
      const path = pathfinder.findPath({ from: 'room_start', to: 'room_end' });
      expect(path).not.toBeNull();
      expect(path!.coherence).toBeGreaterThanOrEqual(0);
      expect(path!.coherence).toBeLessThanOrEqual(1);
    });

    it('should generate poetic description', () => {
      const path = pathfinder.findPath({ from: 'room_start', to: 'room_end' });
      expect(path).not.toBeNull();
      expect(path!.poeticDescription).toBeTruthy();
      expect(path!.poeticDescription.length).toBeGreaterThan(0);
    });

    it('should respect avoided themes', () => {
      // Modify middle room to have avoided theme
      const rooms: PalaceRoom[] = [
        {
          id: 'room_start',
          sessionRef: 'session_start',
          coordinates: { x: 1, y: 0, z: 0 },
          texture: { mood: 'flow', temperature: 'warm', density: 'medium' },
          contents: { insights: ['starting point'], artifacts: [], commits: [], tests: 0 },
          connections: [],
          visited: true,
        },
        {
          id: 'room_bad',
          sessionRef: 'session_bad',
          coordinates: { x: 2, y: 0, z: 0 },
          texture: { mood: 'struggle', temperature: 'cold', density: 'heavy' },
          contents: { insights: ['avoided topic here'], artifacts: [], commits: [], tests: 0 },
          connections: ['room_start'],
          visited: false,
        },
        {
          id: 'room_end',
          sessionRef: 'session_end',
          coordinates: { x: 3, y: 0, z: 0 },
          texture: { mood: 'flow', temperature: 'warm', density: 'medium' },
          contents: { insights: ['destination'], artifacts: [], commits: [], tests: 0 },
          connections: ['room_bad'],
          visited: false,
        },
      ];

      pathfinder.loadRooms(rooms);
      const path = pathfinder.findPath({
        from: 'room_start',
        to: 'room_end',
        avoidThemes: ['avoided'],
      });

      // Path should skip room_bad
      if (path) {
        const badRoom = path.rooms.find(r => r.id === 'room_bad');
        expect(badRoom).toBeUndefined();
      }
    });
  });

  describe('Hidden connections', () => {
    it('should discover semantically similar but unconnected rooms', () => {
      const rooms: PalaceRoom[] = [
        {
          id: 'room_1',
          sessionRef: 'session_1',
          coordinates: { x: 1, y: 0, z: 0 },
          texture: { mood: 'flow', temperature: 'warm', density: 'medium' },
          contents: { insights: ['building memory palace'], artifacts: [], commits: [], tests: 0 },
          connections: [], // No connections yet
          visited: false,
        },
        {
          id: 'room_2',
          sessionRef: 'session_2',
          coordinates: { x: 100000000000, y: 0, z: 0 }, // Far away (not temporal)
          texture: { mood: 'discovery', temperature: 'warm', density: 'medium' },
          contents: { insights: ['expanding memory palace'], artifacts: [], commits: [], tests: 0 },
          connections: [], // No connections yet
          visited: false,
        },
      ];

      pathfinder.loadRooms(rooms);
      const hidden = pathfinder.discoverHiddenConnections(0.3);
      expect(hidden.length).toBeGreaterThan(0);
      expect(hidden[0]!.connectionType).toBe('semantic');
    });
  });

  describe('Statistics', () => {
    it('should provide graph statistics', () => {
      const rooms: PalaceRoom[] = [
        {
          id: 'room_1',
          sessionRef: 'session_1',
          coordinates: { x: 1, y: 0, z: 0 },
          texture: { mood: 'flow', temperature: 'warm', density: 'medium' },
          contents: { insights: ['insight one'], artifacts: [], commits: [], tests: 0 },
          connections: ['room_2'],
          visited: true,
        },
        {
          id: 'room_2',
          sessionRef: 'session_2',
          coordinates: { x: 2, y: 0, z: 0 },
          texture: { mood: 'discovery', temperature: 'warm', density: 'medium' },
          contents: { insights: ['insight two'], artifacts: [], commits: [], tests: 0 },
          connections: ['room_1'],
          visited: true,
        },
      ];

      pathfinder.loadRooms(rooms);
      const stats = pathfinder.getStats();
      expect(stats.roomCount).toBe(2);
      expect(stats.edgeCount).toBeGreaterThan(0);
      expect(stats.averageConnectivity).toBeGreaterThan(0);
    });
  });

  describe('Edge types', () => {
    it('should classify direct connections', () => {
      const rooms: PalaceRoom[] = [
        {
          id: 'room_1',
          sessionRef: 'session_1',
          coordinates: { x: 1, y: 0, z: 0 },
          texture: { mood: 'flow', temperature: 'warm', density: 'medium' },
          contents: { insights: ['first'], artifacts: [], commits: [], tests: 0 },
          connections: ['room_2'],
          visited: false,
        },
        {
          id: 'room_2',
          sessionRef: 'session_2',
          coordinates: { x: 1, y: 0, z: 0 },
          texture: { mood: 'flow', temperature: 'warm', density: 'medium' },
          contents: { insights: ['second'], artifacts: [], commits: [], tests: 0 },
          connections: ['room_1'],
          visited: false,
        },
      ];

      pathfinder.loadRooms(rooms);
      const edges = pathfinder.getEdges('room_1');
      const edgeToRoom2 = edges.find(e => e.to === 'room_2');
      expect(edgeToRoom2).toBeDefined();
      expect(edgeToRoom2!.connectionType).toBe('direct');
    });

    it('should classify temporal connections', () => {
      const rooms: PalaceRoom[] = [
        {
          id: 'room_1',
          sessionRef: 'session_1',
          coordinates: { x: Date.now(), y: 0, z: 0 },
          texture: { mood: 'flow', temperature: 'warm', density: 'medium' },
          contents: { insights: ['recent insight'], artifacts: [], commits: [], tests: 0 },
          connections: [],
          visited: false,
        },
        {
          id: 'room_2',
          sessionRef: 'session_2',
          coordinates: { x: Date.now() + 1000, y: 0, z: 0 },
          texture: { mood: 'discovery', temperature: 'cool', density: 'medium' },
          contents: { insights: ['another recent'], artifacts: [], commits: [], tests: 0 },
          connections: [],
          visited: false,
        },
      ];

      pathfinder.loadRooms(rooms);
      const edges = pathfinder.getEdges('room_1');
      const edgeToRoom2 = edges.find(e => e.to === 'room_2');
      expect(edgeToRoom2).toBeDefined();
      expect(edgeToRoom2!.connectionType).toBe('temporal');
    });
  });
});
