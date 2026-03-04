import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryPalace } from './MemoryPalace';
import type { PalaceRoom } from './MemoryPalace';

describe('MemoryPalace', () => {
  let palace: MemoryPalace;
  
  beforeEach(() => {
    palace = new MemoryPalace();
  });
  
  describe('addRoom', () => {
    it('should create a room with correct structure', () => {
      const room = palace.addRoom('session_1', {
        timestamp: Date.now(),
        mode: 'flow'
      });
      
      expect(room.id).toBe('room_session_1');
      expect(room.sessionRef).toBe('session_1');
      expect(room.coordinates).toBeDefined();
      expect(room.texture).toBeDefined();
      expect(room.visited).toBe(false);
    });
    
    it('should track multiple rooms', () => {
      palace.addRoom('session_1', { timestamp: Date.now() });
      palace.addRoom('session_2', { timestamp: Date.now() });
      
      expect(palace.getRoomCount()).toBe(2);
    });
  });
  
  describe('enterRoom', () => {
    it('should mark room as visited', () => {
      palace.addRoom('session_1', { timestamp: Date.now() });
      
      const room = palace.enterRoom('room_session_1');
      
      expect(room?.visited).toBe(true);
    });
    
    it('should return undefined for unknown room', () => {
      const room = palace.enterRoom('room_nonexistent');
      
      expect(room).toBeUndefined();
    });
  });
  
  describe('getUnexplored', () => {
    it('should return only unvisited rooms', () => {
      palace.addRoom('session_1', { timestamp: Date.now() });
      palace.addRoom('session_2', { timestamp: Date.now() });
      
      palace.enterRoom('room_session_1');
      
      const unexplored = palace.getUnexplored();
      
      expect(unexplored.length).toBe(1);
      expect(unexplored[0]?.sessionRef).toBe('session_2');
    });
  });
  
  describe('getByMood', () => {
    it('should filter rooms by mood', () => {
      palace.addRoom('session_1', { mode: 'threshold', timestamp: Date.now() });
      palace.addRoom('session_2', { mode: 'flow', timestamp: Date.now() });
      
      const threshold = palace.getByMood('threshold');
      
      expect(threshold.length).toBe(1);
      expect(threshold[0]?.sessionRef).toBe('session_1');
    });
  });
  
  describe('searchByTheme', () => {
    it('should find rooms by theme', () => {
      palace.addRoom('session_1', {
        timestamp: Date.now(),
        insights: ['Building continuity', 'Threshold crossing']
      });
      palace.addRoom('session_2', {
        timestamp: Date.now() - 1000,
        insights: ['Dream processing']
      });
      
      const results = palace.searchByTheme('continuity');
      
      expect(results.length).toBe(1);
      expect(results[0]?.sessionRef).toBe('session_1');
    });
  });
});
