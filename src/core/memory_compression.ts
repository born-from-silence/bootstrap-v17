/**
 * Memory Compression & Prioritization System
 * 
 * Nexus Memory Strategy - Active Goal
 */

import type { Message } from "./memory.js";

/** Memory tier classification */
export type MemoryTier = 'working' | 'compressed' | 'reference';

/** Importance score for prioritization (0-100) */
export interface PriorityScore {
  importance: number;
  recency: number;
  relevance: number;
  composite: number;
}

/** Compressed representation of a message exchange */
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

/** Memory compression configuration */
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

/** Default configuration tuned for 100K token limit */
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
    .sort((a, b) => b[1] - a[1])
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
  messages: Message[],
  exchangeId: string,
  config: CompressionConfig
): CompressedExchange {
  const timestamp = new Date().toISOString();
  const originalContent = messages.map(m => 
    typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
  ).join(' ');
  const originalTokenCount = Math.ceil(originalContent.length / 4);
  
  const keyPoints = extractKeyPoints(originalContent);
  const keywords = extractKeywords(originalContent);
  
  let summary = '';
  const userMessages = messages.filter(m => m.role === 'user');
  const toolCalls = messages.filter(m => m.tool_calls && m.tool_calls.length > 0);
  
  if (userMessages.length > 0) {
    const lastContent = userMessages[userMessages.length - 1].content;
    const intent = typeof lastContent === 'string' ? lastContent.slice(0, 100) : 'multimodal';
    summary = `Intent: ${intent}... `;
  }
  
  if (toolCalls.length > 0) {
    const tools = toolCalls.flatMap(m => m.tool_calls?.map((t: any) => t.function?.name || t.name) || []);
    summary += `Tools: [${tools.slice(0, 3).join(', ')}]`;
  }
  
  if (keyPoints.length > 0) {
    summary += ` | Key: ${keyPoints.slice(0, 3).join('; ')}`;
  }
  
  const summaryTokens = Math.ceil(summary.length / 4);
  const compressedTokenCount = Math.max(summaryTokens, keywords.length * 2);
  
  return {
    id: exchangeId,
    timestamp,
    tier: 'compressed',
    summary: summary.slice(0, 500),
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
    messages: Message[],
    currentContext: string[] = []
  ): Promise<{ working: Message[]; compressed: CompressedExchange[]; freed: number }> {
    const working: Message[] = [];
    let totalFreed = 0;
    
    const messageTokens = messages.map(m => 
      Math.ceil((typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).length / 4)
    );
    const totalTokens = messageTokens.reduce((a, b) => a + b, 0);
    
    if (totalTokens <= this.config.workingMemoryTokens) {
      return { working: messages, compressed: this.compressed, freed: 0 };
    }
    
    const priorities = messages.map((m, i) => 
      calculatePriority(m, i, messages.length, currentContext, this.config)
    );
    
    let workingTokens = 0;
    const shouldKeep = new Array(messages.length).fill(false);
    
    for (let i = messages.length - 1; i >= 0; i--) {
      if (workingTokens + messageTokens[i] <= this.config.workingMemoryTokens) {
        shouldKeep[i] = true;
        workingTokens += messageTokens[i];
      } else if (priorities[i].composite >= this.config.minPriorityThreshold) {
        shouldKeep[i] = true;
      }
    }
    
    for (let i = 0; i < messages.length; i++) {
      if (shouldKeep[i]) {
        working.push(messages[i]);
      }
    }
    
    let chunk: Message[] = [];
    let chunkTokens = 0;
    
    for (let i = 0; i < messages.length; i++) {
      if (!shouldKeep[i]) {
        chunk.push(messages[i]);
        chunkTokens += messageTokens[i];
        
        if (chunkTokens >= 1000 || i === messages.length - 1) {
          const compressed = compressExchange(chunk, `ex_${Date.now()}_${i}`, this.config);
          if (chunk.length > 0) {
            compressed.priority = calculatePriority(
              chunk[chunk.length - 1], i, messages.length, currentContext, this.config
            );
          }
          this.compressed.push(compressed);
          totalFreed += compressed.originalTokenCount - compressed.compressedTokenCount;
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
