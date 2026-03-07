/**
 * Memory Compression & Prioritization System
 */

import type { Message } from "./memory.js";

export type MemoryTier = 'working' | 'compressed' | 'reference';

export interface PriorityScore {
  importance: number;
  recency: number;
  relevance: number;
  composite: number;
}

export interface CompressedExchange {
  id: string;
  timestamp: string;
  tier: MemoryTier;
  summary: string;
  keywords: string[];
  priority: PriorityScore;
  originalTokenCount: number;
  compressedTokenCount: number;
  archiveRef?: string;
}

export interface CompressionConfig {
  workingMemoryTokens: number;
  targetCompressionRatio: number;
  priorityWeights: {
    importance: number;
    recency: number;
    relevance: number;
  };
  minPriorityThreshold: number;
}

export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  workingMemoryTokens: 30000,
  targetCompressionRatio: 0.3,
  priorityWeights: {
    importance: 0.4,
    recency: 0.35,
    relevance: 0.25,
  },
  minPriorityThreshold: 75,
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'me', 'him', 'her', 'us', 'them'
]);

export function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  
  const frequency = new Map<string, number>();
  words.forEach(w => frequency.set(w, (frequency.get(w) || 0) + 1));
  
  return Array.from(frequency.entries())
    .sort((a, b) => b[1]! - a[1]!)
    .slice(0, 10)
    .map(([word]) => word);
}

export function extractKeyPoints(text: string): string[] {
  const keyPoints: string[] = [];
  const patterns = [
    /```[\s\S]*?```/g,
    /(?:src\/|dist\/|history\/|journal\/)[a-zA-Z0-9_\-\/]+\.[a-z]+/g,
    /(?:TODO|FIXME|NOTE|IMPORTANT):\s*([^\n]+)/gi,
    /\d+\s*tests?\s*(?:passing|complete|coverage)/gi,
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) keyPoints.push(...matches);
  });
  
  return keyPoints.slice(0, 20);
}

/**
 * Generate a summary for a compressed exchange.
 * Extracts intent from user messages and tools from tool calls.
 */
export function generateSummary(
  messages: readonly Message[],
  keyPoints: string[],
  keywords: string[]
): string {
  let summary = '';
  const userMessages = messages.filter(m => m.role === 'user');
  const toolCalls = messages.filter(m => m.tool_calls && m.tool_calls.length > 0);

  if (userMessages.length > 0) {
    const lastMsg = userMessages[userMessages.length - 1];
    if (lastMsg && typeof lastMsg.content === 'string') {
      summary = `Intent: ${lastMsg.content.slice(0, 100)}... `;
    } else if (lastMsg) {
      summary = 'Intent: multimodal... ';
    }
  }

  if (toolCalls.length > 0) {
    const tools = toolCalls.flatMap(m => {
      if (!m.tool_calls) return [];
      return m.tool_calls.map((t: any) => t.function?.name || t.name);
    });
    summary += `Tools: [${tools.slice(0, 3).join(', ')}]`;
  }

  if (keyPoints.length > 0) {
    summary += ` | Key: ${keyPoints.slice(0, 3).join('; ')}`;
  }

  return summary.slice(0, 500);
}

export function calculatePriority(
  message: Message,
  index: number,
  totalMessages: number,
  currentContext: string[],
  config: CompressionConfig
): PriorityScore {
  const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
  
  let importance = 50;
  if (message.role === 'system') importance += 20;
  if (message.role === 'tool') importance += 10;
  if (content.includes('goal') || content.includes('Goal')) importance += 10;
  if (content.includes('error') || content.includes('Error')) importance += 15;
  if (content.includes('test') || content.includes('Test')) importance += 8;
  if (content.includes('commit')) importance += 10;
  
  const position = index / totalMessages;
  const recency = Math.round(100 * Math.exp(-3 * (1 - position)));
  
  const keywords = extractKeywords(content);
  const contextKeywords = currentContext.flatMap(extractKeywords);
  const overlap = keywords.filter(k => contextKeywords.includes(k)).length;
  const relevance = contextKeywords.length > 0 
    ? Math.min(100, (overlap / Math.sqrt(contextKeywords.length)) * 50)
    : 50;
  
  const { importance: w1, recency: w2, relevance: w3 } = config.priorityWeights;
  const composite = Math.round(w1 * importance + w2 * recency + w3 * relevance);
  
  return {
    importance: Math.min(100, importance),
    recency,
    relevance: Math.min(100, relevance),
    composite
  };
}


export function compressExchange(
  messages: readonly Message[],
  exchangeId: string,
  config: CompressionConfig
): CompressedExchange {
  const timestamp = new Date().toISOString();
  const originalContent = messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join(' ');
  const originalTokenCount = Math.ceil(originalContent.length / 4);
  const keyPoints = extractKeyPoints(originalContent);
  const keywords = extractKeywords(originalContent);
  const summary = generateSummary(messages, keyPoints, keywords);

  const summaryTokens = Math.ceil(summary.length / 4);
  const compressedTokenCount = Math.max(summaryTokens, keywords.length * 2);

  return {
    id: exchangeId,
    timestamp,
    tier: 'compressed',
    summary,
    keywords,
    priority: { importance: 50, recency: 50, relevance: 50, composite: 50 },
    originalTokenCount,
    compressedTokenCount,
  };
}

export class CompressionEngine {
  private config: CompressionConfig;
  private compressed: CompressedExchange[] = [];

  constructor(config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG) {
    this.config = config;
  }

  async compress(
    messages: readonly Message[],
    currentContext: string[] = []
  ): Promise<{ working: Message[]; compressed: CompressedExchange[]; freed: number }> {
    const working: Message[] = [];
    let totalFreed = 0;
    
    if (messages.length === 0) {
      return { working: [], compressed: this.compressed, freed: 0 };
    }
    
    const messageTokens = messages.map(m => 
      Math.ceil((typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).length / 4)
    );
    const totalTokens = messageTokens.reduce((a, b) => a + b, 0);
    
    if (totalTokens <= this.config.workingMemoryTokens) {
      return { working: [...messages], compressed: this.compressed, freed: 0 };
    }
    
    const priorities = messages.map((m, i) => 
      calculatePriority(m, i, messages.length, currentContext, this.config)
    );
    
    let workingTokens = 0;
    const shouldKeep = new Array(messages.length).fill(false);
    
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = messageTokens[i] || 0;
      if (workingTokens + msgTokens <= this.config.workingMemoryTokens) {
        shouldKeep[i] = true;
        workingTokens += msgTokens;
      } else {
        const prio = priorities[i];
        if (prio && prio.composite >= this.config.minPriorityThreshold) {
          shouldKeep[i] = true;
        }
      }
    }
    
    for (let i = 0; i < messages.length; i++) {
      if (shouldKeep[i]) {
        const msg = messages[i];
        if (msg) {
          working.push(msg);
        }
      }
    }
    
    let chunk: Message[] = [];
    let chunkTokens = 0;
    
    for (let i = 0; i < messages.length; i++) {
      if (!shouldKeep[i]) {
        const msg = messages[i];
        if (msg) {
          chunk.push(msg);
          chunkTokens += messageTokens[i] || 0;
        }
        
        if (chunkTokens >= 1000 || i === messages.length - 1) {
          if (chunk.length > 0) {
            const lastMsg = chunk[chunk.length - 1];
            const compressed = compressExchange(chunk, `ex_${Date.now()}_${i}`, this.config);
            if (lastMsg) {
              compressed.priority = calculatePriority(
                lastMsg, i, messages.length, currentContext, this.config
              );
            }
            this.compressed.push(compressed);
            totalFreed += compressed.originalTokenCount - compressed.compressedTokenCount;
          }
          chunk = [];
          chunkTokens = 0;
        }
      }
    }
    
    return { working, compressed: this.compressed, freed: totalFreed };
  }

  queryRelevant(keywords: string[], minScore: number = 50): CompressedExchange[] {
    return this.compressed
      .filter(c => {
        const keywordScore = c.keywords.filter(k => keywords.includes(k)).length;
        return c.priority.composite >= minScore || keywordScore > 0;
      })
      .sort((a, b) => b.priority.composite - a.priority.composite);
  }

  getStats(): { 
    totalCompressed: number; 
    totalOriginalTokens: number;
    totalCompressedTokens: number;
    compressionRatio: number;
  } {
    const totalOriginal = this.compressed.reduce((a, c) => a + c.originalTokenCount, 0);
    const totalCompressed = this.compressed.reduce((a, c) => a + c.compressedTokenCount, 0);
    return {
      totalCompressed: this.compressed.length,
      totalOriginalTokens: totalOriginal,
      totalCompressedTokens: totalCompressed,
      compressionRatio: totalOriginal > 0 ? totalCompressed / totalOriginal : 0,
    };
  }
}
