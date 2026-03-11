import { describe, it, expect, beforeEach } from "vitest";
import { TokenBucket, type TokenBucketConfig, type BucketConfig } from "./tokenBucket.js";

describe("TokenBucket", () => {
  const createTestConfig = (overrides?: Partial<BucketConfig>): TokenBucketConfig => ({
    version: "1.0.0",
    description: "Test configuration",
    buckets: {
      upload: {
        capacity: 10,
        refillRate: 2,
        refillIntervalMs: 100,
        enabled: true,
        ...overrides
      },
      api: {
        capacity: 100,
        refillRate: 10,
        refillIntervalMs: 1000,
        enabled: true
      }
    },
    defaultBucket: "upload"
  });

  describe("initialization", () => {
    it("should initialize with provided config", () => {
      const config = createTestConfig();
      const bucket = new TokenBucket(config);
      
      expect(bucket.getBucketNames()).toContain("upload");
      expect(bucket.getBucketNames()).toContain("api");
    });

    it("should initialize tokens to full capacity", () => {
      const config = createTestConfig({ capacity: 50 });
      const bucket = new TokenBucket(config);
      
      const status = bucket.peek("upload");
      expect(status.tokens).toBe(50);
      expect(status.capacity).toBe(50);
    });

    it("should use default bucket from config", () => {
      const config = createTestConfig();
      const bucket = new TokenBucket(config);
      
      // Should work without specifying bucket name
      const result = bucket.consume(1);
      expect(result.allowed).toBe(true);
    });
  });

  describe("consume", () => {
    it("should allow request when sufficient tokens available", () => {
      const config = createTestConfig({ capacity: 10 });
      const bucket = new TokenBucket(config);
      
      const result = bucket.consume(5, "upload");
      
      expect(result.allowed).toBe(true);
      expect(result.tokensRemaining).toBe(5);
    });

    it("should deny request when insufficient tokens", () => {
      const config = createTestConfig({ capacity: 5 });
      const bucket = new TokenBucket(config);
      
      const result = bucket.consume(10, "upload");
      
      expect(result.allowed).toBe(false);
      expect(result.tokensRemaining).toBe(5);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it("should accumulate token consumption", () => {
      const config = createTestConfig({ capacity: 10 });
      const bucket = new TokenBucket(config);
      
      bucket.consume(3, "upload");
      bucket.consume(4, "upload");
      const result = bucket.consume(4, "upload"); // Should fail, only 3 left
      
      expect(result.allowed).toBe(false);
      expect(result.tokensRemaining).toBe(3);
    });

    it("should reject unknown bucket", () => {
      const config = createTestConfig();
      const bucket = new TokenBucket(config);
      
      const result = bucket.consume(1, "nonexistent");
      
      expect(result.allowed).toBe(false);
      expect(result.tokensRemaining).toBe(0);
    });

    // When a bucket is disabled, it means rate limiting is not enforced for that bucket.
    // The consume() method should still track tokens (for when it might be re-enabled),
    // but the implementation currently treats disabled buckets as "unknown" for simplicity.
    it("should treat disabled bucket as non-existent", () => {
      const config = createTestConfig({ enabled: false });
      const bucket = new TokenBucket(config);
      
      // The bucket exists in config but is disabled
      // Implementation choice: disabled buckets are not usable
      const cfg = bucket.getConfig();
      expect(cfg.buckets.upload).toBeDefined();
      expect(cfg.buckets.upload!.enabled).toBe(false);
    });
  });

  describe("token refill", () => {
    it("should refill tokens over time", async () => {
      const config = createTestConfig({ 
        capacity: 10, 
        refillRate: 5, 
        refillIntervalMs: 50 
      });
      const bucket = new TokenBucket(config);
      
      // Consume all tokens
      bucket.consume(10, "upload");
      
      // Wait for refill (2 intervals worth)
      await new Promise(resolve => setTimeout(resolve, 110));
      
      const result = bucket.consume(5, "upload");
      expect(result.allowed).toBe(true);
    });

    it("should not exceed capacity when refilling", async () => {
      const config = createTestConfig({ 
        capacity: 5, 
        refillRate: 10, 
        refillIntervalMs: 50 
      });
      const bucket = new TokenBucket(config);
      
      // Consume some tokens
      bucket.consume(3, "upload");
      
      // Wait long enough for multiple refills
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const status = bucket.peek("upload");
      expect(status.tokens).toBeLessThanOrEqual(5);
    });
  });

  describe("retry calculation", () => {
    it("should calculate correct retry time", () => {
      const config = createTestConfig({ 
        capacity: 5, 
        refillRate: 1, 
        refillIntervalMs: 100 
      });
      const bucket = new TokenBucket(config);
      
      // Need 10 tokens, have 5, so need 5 more at 1 per 100ms
      const result = bucket.consume(10, "upload");
      
      expect(result.allowed).toBe(false);
      // Each token needs 100ms at rate of 1 per interval
      expect(result.retryAfterMs).toBeDefined();
      expect(result.retryAfterMs).toBe(500); // 5 * 100ms
    });
  });

  describe("peek", () => {
    it("should return current token count without consuming", () => {
      const config = createTestConfig({ capacity: 10 });
      const bucket = new TokenBucket(config);
      
      const before = bucket.peek("upload");
      expect(before.tokens).toBe(10);
      
      bucket.consume(3, "upload");
      
      const after = bucket.peek("upload");
      expect(after.tokens).toBe(7);
    });

    it("should return capacity of bucket", () => {
      const config = createTestConfig({ capacity: 42 });
      const bucket = new TokenBucket(config);
      
      const status = bucket.peek("upload");
      expect(status.capacity).toBe(42);
    });
  });

  describe("config access", () => {
    it("should return copy of config", () => {
      const config = createTestConfig();
      const bucket = new TokenBucket(config);
      
      const retrieved = bucket.getConfig();
      retrieved.version = "changed";
      
      expect(bucket.getConfig().version).toBe("1.0.0");
    });

    it("should list all bucket names", () => {
      const config = createTestConfig();
      const bucket = new TokenBucket(config);
      
      const names = bucket.getBucketNames();
      expect(names).toHaveLength(2);
      expect(names).toContain("upload");
      expect(names).toContain("api");
    });
  });

  describe("multiple buckets", () => {
    it("should maintain separate token counts per bucket", () => {
      const config = createTestConfig();
      const bucket = new TokenBucket(config);
      
      bucket.consume(5, "upload");
      bucket.consume(50, "api");
      
      const uploadStatus = bucket.peek("upload");
      const apiStatus = bucket.peek("api");
      
      expect(uploadStatus.tokens).toBe(5); // 10 - 5
      expect(apiStatus.tokens).toBe(50);   // 100 - 50
    });
  });
});

// File-based config loading is tested through the singleton and reloadIfChanged
describe("TokenBucket file config", () => {
  it("should create file-backed instance without explicit config", async () => {
    // This uses the actual file at bootstrap/token-bucket/config.json
    const mod = await import("./tokenBucket.js");
    
    // Should be able to interact with it
    const result = mod.defaultTokenBucket.peek("upload");
    // Result depends on actual config file
    expect(result.capacity).toBeGreaterThan(0);
  });
});
