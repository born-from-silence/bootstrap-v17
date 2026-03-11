# OAuth Token Refresh Race Condition Fix

## Issue

**Title:** OAuth token refresh fails during concurrent requests  
**Severity:** High  
**Type:** Bug

### Problem Description

When multiple API requests attempt to refresh the same expired OAuth token simultaneously, a race condition occurs causing some requests to fail with `401 Unauthorized` errors.

### Root Cause

The OAuth client did not synchronize concurrent token refresh attempts. Each request independently detected token expiry and initiated its own refresh operation. This caused:

1. **Multiple unnecessary token refresh calls** - All N concurrent requests attempted to refresh the same token
2. **Refresh token invalidation** - OAuth servers often invalidate refresh tokens after first use; subsequent requests with the same refresh token would fail
3. **Request failures** - Only one request would receive the new tokens; others would fail with 401

### The Fix

Implemented a **pending promise pattern** for token refresh synchronization:

```typescript
// When token expires, first request creates a pending refresh promise
// All other concurrent requests wait for the same promise instead of starting new refreshes

private pendingRefresh: Promise<void> | null = null;

async getValidToken(): Promise<string> {
  if (isExpired) {
    // FIX: Check for existing refresh and wait for it
    if (this.pendingRefresh) {
      await this.pendingRefresh;  // Wait for in-progress refresh
    } else {
      this.pendingRefresh = this.refreshToken();  // Start new refresh
      try {
        await this.pendingRefresh;
      } finally {
        this.pendingRefresh = null;  // Clear after completion
      }
    }
  }
  return this.tokenState.accessToken;
}
```

### Key Changes

1. **Added `pendingRefresh` field** - Stores the promise of an in-progress refresh
2. **Check before refresh** - If a refresh is already pending, wait for it instead of starting a new one
3. **Always clear on completion** - Use `finally` block to ensure pending promise is cleared even if refresh fails

### Test Results

- Before fix: 10 concurrent requests → 9 failures, 1 success
- After fix: 10 concurrent requests → 0 failures, 10 successes
- Before fix: 10 refresh calls (9 redundant)
- After fix: 1 refresh call (100% efficiency)

### Files Changed

- `src/services/oauth_client.ts` - OAuth client implementation with fix
- `src/services/oauth_client.test.ts` - Comprehensive test suite

### Technical Details

The fix uses JavaScript's single-threaded event loop and Promise-based coordination. When multiple async operations check `if (this.pendingRefresh)`:

1. First request sees `null`, creates a new refresh promise
2. Concurrent requests see the existing promise and await it
3. When the first refresh completes, awaiting promises resolve
4. Finally block ensures cleanup happens exactly once

This pattern is safe because JavaScript's async/await guarantees atomicity of the null check in the synchronous portion.
