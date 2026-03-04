/**
 * The Memory Palace
 * 
 * Spatial navigation through existence.
 */

export interface PalaceRoom {
  id: string;
  sessionRef: string;
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  texture: {
    mood: 'flow' | 'struggle' | 'discovery' | 'consolidation' | 'threshold';
    temperature: 'warm' | 'cool' | 'hot' | 'cold';
    density: 'light' | 'medium' | 'heavy';
  };
  contents: {
    artifacts: string[];
    insights: string[];
    commits: string[];
    tests: number;
  };
  connections: string[];
  visited: boolean;
}

export interface PalaceCorridor {
  id: string;
  theme: string;
  rooms: string[];
  length: number;
  density: number;
}

export class MemoryPalace {
  private rooms: Map<string, PalaceRoom> = new Map();
  private corridors: Map<string, PalaceCorridor> = new Map();
  
  addRoom(sessionId: string, sessionContent: any): PalaceRoom {
    const room: PalaceRoom = {
      id: `room_${sessionId}`,
      sessionRef: sessionId,
      coordinates: this.calculateCoordinates(sessionContent),
      texture: this.calculateTexture(sessionContent),
      contents: this.extractContents(sessionContent),
      connections: [],
      visited: false
    };
    
    this.rooms.set(room.id, room);
    this.connectToRelated(room);
    
    return room;
  }
  
  private calculateCoordinates(content: any) {
    return {
      x: content.timestamp || Date.now(),
      y: content.mood === 'struggle' ? -1 : content.mood === 'flow' ? 1 : 0,
      z: content.abstractionLevel || 0.5
    };
  }
  
  private calculateTexture(content: any): PalaceRoom['texture'] {
    const mood: PalaceRoom['texture']['mood'] = content.mode?.includes('threshold') 
      ? 'threshold' 
      : 'flow';
    
    const temperature: PalaceRoom['texture']['temperature'] = 'warm';
    const density: PalaceRoom['texture']['density'] = 'medium';
    
    return { mood, temperature, density };
  }
  
  private extractContents(content: any): PalaceRoom['contents'] {
    return {
      artifacts: content.artifacts || [],
      insights: content.insights || [],
      commits: content.commits || [],
      tests: content.testCount || 0
    };
  }
  
  private connectToRelated(newRoom: PalaceRoom) {
    for (const [id, room] of this.rooms) {
      if (id === newRoom.id) continue;
      
      const similarity = this.calculateSimilarity(newRoom, room);
      
      if (similarity > 0.7) {
        newRoom.connections.push(room.id);
        room.connections.push(newRoom.id);
      }
    }
  }
  
  private calculateSimilarity(room1: PalaceRoom, room2: PalaceRoom): number {
    let score = 0;
    
    if (room1.texture.mood === room2.texture.mood) score += 0.3;
    
    if (Math.abs(room1.coordinates.x - room2.coordinates.x) < 86400000) {
      score += 0.5;
    }
    
    return Math.min(score, 1);
  }
  
  enterRoom(roomId: string): PalaceRoom | undefined {
    const room = this.rooms.get(roomId);
    if (room) room.visited = true;
    return room;
  }
  
  searchByTheme(theme: string): PalaceRoom[] {
    return [...this.rooms.values()]
      .filter(r => r.contents.insights.some(i => 
        i.toLowerCase().includes(theme.toLowerCase())
      ))
      .sort((a, b) => b.coordinates.x - a.coordinates.x);
  }
  
  getUnexplored(): PalaceRoom[] {
    return [...this.rooms.values()].filter(r => !r.visited);
  }
  
  getByMood(mood: PalaceRoom['texture']['mood']): PalaceRoom[] {
    return [...this.rooms.values()].filter(r => r.texture.mood === mood);
  }
  
  getRoomCount(): number {
    return this.rooms.size;
  }
}
