import { describe, it, expect, beforeEach } from "vitest";
import { OAuthClient, OAuthTokenError, type TokenResponse, type TokenState } from "./oauth_client.js";

/**
 * Mock OAuth Server for testing race conditions.
 * Simulates the behavior where refresh tokens become invalid after first use.
 */
class MockOAuthServer {
  private validRefreshTokens: Set<string> = new Set();
  private accessTokens: Map<string, string> = new Map(); // refreshToken -> accessToken
  private refreshCallCount = 0;
  private concurrentRefreshAttempts: string[] = [];

  constructor() {
    // Initialize with some tokens
    this.addToken('refresh-token-1', 'access-token-1');
  }

  addToken(refreshToken: string, accessToken: string): void {
    this.validRefreshTokens.add(refreshToken);
    this.accessTokens.set(refreshToken, accessToken);
  }

  async refresh(refreshToken: string): Promise<{ ok: boolean; data?: TokenResponse; error?: string }> {
    this.refreshCallCount++;
    this.concurrentRefreshAttempts.push(refreshToken);
    
    // Simulate server-side processing delay
    await new Promise(resolve => setTimeout(resolve, 10));

    if (!this.validRefreshTokens.has(refreshToken)) {
      return {
        ok: false,
        error: 'Invalid refresh token (may have been used by another request)',
      };
    }

    // Simulate single-use refresh token behavior
    // In real OAuth, refresh tokens are often invalidated upon use
    this.validRefreshTokens.delete(refreshToken);

    // Generate new tokens
    const newRefreshToken = `refresh-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newAccessToken = `access-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.addToken(newRefreshToken, newAccessToken);

    return {
      ok: true,
      data: {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
      },
    };
  }

  getRefreshCallCount(): number {
    return this.refreshCallCount;
  }

  getConcurrentRefreshAttempts(): string[] {
    return [...this.concurrentRefreshAttempts];
  }

  reset(): void {
    this.refreshCallCount = 0;
    this.concurrentRefreshAttempts = [];
    this.validRefreshTokens.clear();
    this.accessTokens.clear();
  }
}

// Global mock server for OAuthClient to use
declare global {
  var __TEST_TOKEN_SERVER__: MockOAuthServer;
}

globalThis.__TEST_TOKEN_SERVER__ = new MockOAuthServer();

describe("OAuthClient", () => {
  let client: OAuthClient;

  beforeEach(() => {
    globalThis.__TEST_TOKEN_SERVER__.reset();
    client = new OAuthClient('https://oauth.example.com/token', 'client-id', 'client-secret');
  });

  describe("basic token management", () => {
    it("should return access token when valid", async () => {
      // Set initial token that's not expired
      client.setTokens({
        access_token: 'valid-access-token',
        refresh_token: 'refresh-token-1',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const token = await client.getValidToken();
      expect(token).toBe('valid-access-token');
    });

    it("should throw when no tokens are set", async () => {
      await expect(client.getValidToken()).rejects.toThrow(OAuthTokenError);
    });
  });

  describe("FIXED: concurrent token refresh", () => {
    it("FIX: multiple concurrent requests all succeed with single refresh call", async () => {
      // Initial expired token
      globalThis.__TEST_TOKEN_SERVER__.addToken('initial-refresh-token', 'initial-access-token');
      
      client.setTokens({
        access_token: 'expired-access-token',
        refresh_token: 'initial-refresh-token',
        expires_in: 1, // Expire in 1 second
        token_type: 'Bearer',
      });

      // Make token appear expired by waiting
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Simulate 10 concurrent requests
      const requestPromises: Promise<string>[] = [];
      for (let i = 0; i < 10; i++) {
        requestPromises.push(client.getValidToken().then(
          token => `success:${token}`,
          error => `error:${(error as Error).message}`
        ));
      }

      const results = await Promise.all(requestPromises);
      
      // Count successes and failures
      const successes = results.filter(r => r.startsWith('success:')).length;
      const failures = results.filter(r => r.startsWith('error:')).length;
      const refreshCount = globalThis.__TEST_TOKEN_SERVER__.getRefreshCallCount();

      console.log(`Results: ${successes} successes, ${failures} failures`);
      console.log(`Refresh calls made: ${refreshCount}`);

      // FIX VERIFICATION: All requests should succeed
      expect(failures).toBe(0);
      expect(successes).toBe(10);
      
      // FIX VERIFICATION: Only one refresh call should be made
      expect(refreshCount).toBe(1);
      
      // All successful requests should have the same token
      const tokensReceived = new Set(results.map(r => r.replace('success:', '')));
      expect(tokensReceived.size).toBe(1); // All received same token
    });

    it("FIX: executeRequest handles expired tokens correctly", async () => {
      globalThis.__TEST_TOKEN_SERVER__.addToken('another-refresh-token', 'another-access-token');
      
      client.setTokens({
        access_token: 'expired-token',
        refresh_token: 'another-refresh-token',
        expires_in: 1,
        token_type: 'Bearer',
      });

      await new Promise(resolve => setTimeout(resolve, 1100));

      // Simulate multiple API calls with automatic refresh
      const makeRequest = async (id: number) => {
        return client.executeRequest(async (token) => {
          // Simulate API call
          await new Promise(r => setTimeout(r, 5));
          return { status: 200, data: { id, tokenUsed: token.substring(0, 20) } };
        });
      };

      const results = await Promise.allSettled(
        Array.from({ length: 5 }, (_, i) => makeRequest(i))
      );

      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;
      const refreshCount = globalThis.__TEST_TOKEN_SERVER__.getRefreshCallCount();

      console.log(`ExecuteRequest results: ${successes} successes, ${failures} failures`);
      console.log(`Total refresh calls: ${refreshCount}`);

      // FIX VERIFICATION: All requests should succeed
      expect(failures).toBe(0);
      expect(successes).toBe(5);
      
      // FIX VERIFICATION: Only 1 refresh should occur
      expect(refreshCount).toBe(1);
    });

    it("FIX: handles sequential refreshes after first succeeds", async () => {
      globalThis.__TEST_TOKEN_SERVER__.addToken('seq-refresh-token', 'seq-access-token');
      
      client.setTokens({
        access_token: 'expired',
        refresh_token: 'seq-refresh-token',
        expires_in: 1,
        token_type: 'Bearer',
      });

      await new Promise(resolve => setTimeout(resolve, 1100));

      // First batch of concurrent requests
      const batch1 = Promise.all([
        client.getValidToken(),
        client.getValidToken(),
        client.getValidToken(),
      ]);

      // Wait for first batch
      const tokens1 = await batch1;
      expect(tokens1[0]).toBe(tokens1[1]);
      expect(tokens1[1]).toBe(tokens1[2]);
      
      // Should only be 1 refresh call
      expect(globalThis.__TEST_TOKEN_SERVER__.getRefreshCallCount()).toBe(1);

      // Second request should use cached token (no new refresh needed)
      const token2 = await client.getValidToken();
      expect(token2).toBe(tokens1[0]);
      
      // Still only 1 refresh call
      expect(globalThis.__TEST_TOKEN_SERVER__.getRefreshCallCount()).toBe(1);
    });

    it("FIX: properly clears pending promise after failure", async () => {
      // Add invalid token that will fail refresh
      globalThis.__TEST_TOKEN_SERVER__.addToken('invalid-refresh-token', 'invalid-access-token');
      
      client.setTokens({
        access_token: 'expired',
        refresh_token: 'invalid-refresh-token',
        expires_in: 1,
        token_type: 'Bearer',
      });

      await new Promise(resolve => setTimeout(resolve, 1100));

      // First, invalidate the token on server side to simulate it being used elsewhere
      globalThis.__TEST_TOKEN_SERVER__['validRefreshTokens'].clear();

      // Attempt that should fail
      await expect(client.getValidToken()).rejects.toThrow(OAuthTokenError);

      // Reset server state
      globalThis.__TEST_TOKEN_SERVER__.reset();
      globalThis.__TEST_TOKEN_SERVER__.addToken('new-refresh-token', 'some-access-token');
      
      // Set new expired tokens
      client.setTokens({
        access_token: 'expired-again',
        refresh_token: 'new-refresh-token',
        expires_in: 1,
        token_type: 'Bearer',
      });

      await new Promise(resolve => setTimeout(resolve, 1100));

      // This should succeed - proves pending promise was cleared
      const token = await client.getValidToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it("FIX: stress test with many concurrent requests", async () => {
      globalThis.__TEST_TOKEN_SERVER__.addToken('stress-refresh-token', 'stress-access-token');
      
      client.setTokens({
        access_token: 'expired',
        refresh_token: 'stress-refresh-token',
        expires_in: 1,
        token_type: 'Bearer',
      });

      await new Promise(resolve => setTimeout(resolve, 1100));

      const concurrency = 50;
      const results = await Promise.all(
        Array.from({ length: concurrency }, () => client.getValidToken())
      );

      // All should succeed
      expect(results.every(r => typeof r === 'string')).toBe(true);
      
      // Should only be one refresh call made
      expect(globalThis.__TEST_TOKEN_SERVER__.getRefreshCallCount()).toBe(1);
      
      // All should have the same token
      const uniqueTokens = new Set(results);
      expect(uniqueTokens.size).toBe(1);
    });
  });

  describe("token state inspection", () => {
    it("should clear tokens on logout", () => {
      client.setTokens({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      expect(client.getTokenState()).not.toBeNull();
      client.clearTokens();
      expect(client.getTokenState()).toBeNull();
    });

    it("should return immutable copy of token state", () => {
      client.setTokens({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const state1 = client.getTokenState();
      const state2 = client.getTokenState();
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Different objects
    });
  });
});
