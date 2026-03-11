import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to bootstrap config - relative to src/services, go up to project root then into bootstrap
const CONFIG_PATH = path.resolve(__dirname, "../../bootstrap/token-bucket/config.json");

/**
 * Configuration for a single token bucket
 */
export interface BucketConfig {
  capacity: number;        // Maximum tokens in bucket
  refillRate: number;      // Tokens to add per interval
  refillIntervalMs: number; // Milliseconds between refills
  enabled: boolean;        // Whether this bucket is active
}

/**
 * Full configuration structure from bootstrap/token-bucket/config.json
 */
export interface TokenBucketConfig {
  version: string;
  description: string;
  buckets: Record<string, BucketConfig>;
  defaultBucket: string;
}

/**
 * Result of attempting to consume tokens
 */
export interface ConsumeResult {
  allowed: boolean;
  tokensRemaining: number;
  retryAfterMs?: number;
}

/**
 * TokenBucket implements a rate limiter using the token bucket algorithm.
 * Reads configuration from bootstrap/token-bucket/config.json and supports
 * dynamic reloading to adapt to changing constraints without restart.
 * 
 * The token-bucket algorithm works by:
 * 1. Maintaining a bucket with a fixed capacity of tokens
 * 2. Refilling tokens at a steady rate over time
 * 3. Each request consumes tokens; if insufficient tokens remain, the request is denied
 * 
 * This establishes upload limits as configurable constraints rather than hard-coded assumptions.
 */
export class TokenBucket {
  private config: TokenBucketConfig;
  private tokens: Map<string, number> = new Map();
  private lastRefill: Map<string, number> = new Map();
  private configMtime: number = 0;
  private isFileConfig: boolean = false;

  constructor(config?: TokenBucketConfig) {
    if (config) {
      this.config = config;
      this.isFileConfig = false;
    } else {
      this.config = this.loadConfigFromFile();
      this.isFileConfig = true;
    }
    this.initializeTokens();
  }

  /**
   * Load configuration from the bootstrap token-bucket config file.
   * Returns default config if file doesn't exist or is malformed.
   */
  private loadConfigFromFile(): TokenBucketConfig {
    const defaultConfig: TokenBucketConfig = {
      version: "1.0.0",
      description: "Default token bucket configuration",
      buckets: {
        upload: {
          capacity: 100,
          refillRate: 10,
          refillIntervalMs: 1000,
          enabled: true
        }
      },
      defaultBucket: "upload"
    };

    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        console.warn(`[TOKEN_BUCKET] Config not found at ${CONFIG_PATH}, using defaults`);
        return defaultConfig;
      }

      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(raw) as TokenBucketConfig;
      
      // Update mtime tracking for dynamic reload
      const stats = fs.statSync(CONFIG_PATH);
      this.configMtime = stats.mtimeMs;
      
      return parsed;
    } catch (err) {
      console.error(`[TOKEN_BUCKET] Failed to load config: ${err}`);
      return defaultConfig;
    }
  }

  /**
   * Initialize token counts for all configured buckets
   */
  private initializeTokens(): void {
    const now = Date.now();
    for (const [name, bucketConfig] of Object.entries(this.config.buckets)) {
      this.tokens.set(name, bucketConfig.capacity);
      this.lastRefill.set(name, now);
    }
  }

  /**
   * Check if config has been modified and reload if necessary.
   * Call this before operations that need fresh config.
   * Only reloads if this instance was created with file-based config.
   */
  reloadIfChanged(): boolean {
    // Skip file reloading if this instance was given config directly
    if (!this.isFileConfig) {
      return false;
    }
    
    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        return false;
      }

      const stats = fs.statSync(CONFIG_PATH);
      if (stats.mtimeMs > this.configMtime) {
        console.log(`[TOKEN_BUCKET] Config changed, reloading...`);
        this.config = this.loadConfigFromFile();
        
        // Add any new buckets, but preserve existing token counts
        const now = Date.now();
        for (const [name, bucketConfig] of Object.entries(this.config.buckets)) {
          if (!this.tokens.has(name)) {
            this.tokens.set(name, bucketConfig.capacity);
            this.lastRefill.set(name, now);
          }
        }
        
        return true;
      }
    } catch (err) {
      console.error(`[TOKEN_BUCKET] Failed to check config reload: ${err}`);
    }
    return false;
  }

  /**
   * Refill tokens for a specific bucket based on elapsed time
   */
  private refill(bucketName: string): void {
    const bucketConfig = this.config.buckets[bucketName];
    if (!bucketConfig) {
      return;
    }

    const now = Date.now();
    const lastRefillTime = this.lastRefill.get(bucketName) ?? now;
    const elapsedMs = now - lastRefillTime;
    
    // Calculate tokens to add based on elapsed time
    const intervals = Math.floor(elapsedMs / bucketConfig.refillIntervalMs);
    const tokensToAdd = intervals * bucketConfig.refillRate;
    
    if (tokensToAdd > 0) {
      const currentTokens = this.tokens.get(bucketName) ?? 0;
      const newTokens = Math.min(currentTokens + tokensToAdd, bucketConfig.capacity);
      this.tokens.set(bucketName, newTokens);
      
      // Update last refill time accounting for partial intervals
      this.lastRefill.set(bucketName, lastRefillTime + (intervals * bucketConfig.refillIntervalMs));
    }
  }

  /**
   * Attempt to consume tokens from a bucket.
   * 
   * @param tokenCount - Number of tokens to consume (default: 1)
   * @param bucketName - Name of the bucket to use (default: config.defaultBucket)
   * @returns ConsumeResult indicating whether request is allowed
   */
  consume(tokenCount: number = 1, bucketName?: string): ConsumeResult {
    // Check for config changes before consuming
    this.reloadIfChanged();
    
    const targetBucket = bucketName ?? this.config.defaultBucket;
    const bucketConfig = this.config.buckets[targetBucket];
    
    if (!bucketConfig) {
      return {
        allowed: false,
        tokensRemaining: 0,
        retryAfterMs: 0
      };
    }

    // Refill based on elapsed time
    this.refill(targetBucket);
    
    const currentTokens = this.tokens.get(targetBucket) ?? 0;
    
    if (currentTokens >= tokenCount) {
      // Sufficient tokens available
      const newTokens = currentTokens - tokenCount;
      this.tokens.set(targetBucket, newTokens);
      
      return {
        allowed: true,
        tokensRemaining: newTokens
      };
    } else {
      // Insufficient tokens - calculate retry time
      const tokensNeeded = tokenCount - currentTokens;
      const intervalsNeeded = Math.ceil(tokensNeeded / bucketConfig.refillRate);
      const retryAfterMs = intervalsNeeded * bucketConfig.refillIntervalMs;
      
      return {
        allowed: false,
        tokensRemaining: currentTokens,
        retryAfterMs
      };
    }
  }

  /**
   * Check current token count without consuming.
   * Useful for monitoring/debugging.
   */
  peek(bucketName?: string): { tokens: number; capacity: number } {
    this.reloadIfChanged();
    
    const targetBucket = bucketName ?? this.config.defaultBucket;
    const bucketConfig = this.config.buckets[targetBucket];
    
    if (!bucketConfig) {
      return { tokens: 0, capacity: 0 };
    }

    this.refill(targetBucket);
    
    return {
      tokens: this.tokens.get(targetBucket) ?? 0,
      capacity: bucketConfig.capacity
    };
  }

  /**
   * Get the current configuration (for inspection)
   */
  getConfig(): TokenBucketConfig {
    return { ...this.config };
  }

  /**
   * Get list of available bucket names
   */
  getBucketNames(): string[] {
    return Object.keys(this.config.buckets);
  }
}

// Export a singleton instance for application-wide rate limiting
export const defaultTokenBucket = new TokenBucket();
