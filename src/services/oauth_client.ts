/**
 * OAuth 2.0 Token Client
 * Handles access tokens with automatic refresh on expiry.
 * 
 * FIX: Implements synchronized token refresh using a pending promise.
 * When multiple concurrent requests need token refresh, only the first
 * initiates the refresh, and all others wait for the same promise.
 */

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export class OAuthTokenError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'OAuthTokenError';
  }
}

/**
 * OAuthClient manages token refresh for API requests.
 * 
 * FIX: Uses a pending refresh promise pattern to handle concurrent requests.
 * When token expiry is detected, only one refresh operation is executed,
 * and all concurrent callers receive the same promise result.
 */
export class OAuthClient {
  private tokenState: TokenState | null = null;
  private refreshEndpoint: string;
  private clientId: string;
  private clientSecret: string;
  
  // FIX: Pending promise for concurrent refresh synchronization
  private pendingRefresh: Promise<void> | null = null;

  constructor(refreshEndpoint: string, clientId: string, clientSecret: string) {
    this.refreshEndpoint = refreshEndpoint;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Set the current token state (e.g., after initial authentication)
   */
  setTokens(response: TokenResponse): void {
    const now = Date.now();
    this.tokenState = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: now + (response.expires_in * 1000),
    };
  }

  /**
   * Get a valid access token, refreshing if necessary.
   * 
   * FIX: Checks for existing pending refresh and waits on it if present,
   * preventing multiple simultaneous refresh attempts.
   */
  async getValidToken(): Promise<string> {
    // Check if token needs refresh (5 minute buffer)
    const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes in ms
    
    if (!this.tokenState) {
      throw new OAuthTokenError('No tokens available', 401);
    }

    const isExpired = Date.now() >= (this.tokenState.expiresAt - TOKEN_EXPIRY_BUFFER);
    
    if (isExpired) {
      // FIX: If a refresh is already in progress, wait for it instead of starting a new one
      if (this.pendingRefresh) {
        console.log('Token refresh already in progress, waiting...');
        await this.pendingRefresh;
      } else {
        // Start a new refresh operation
        console.log('Token expired, initiating refresh...');
        this.pendingRefresh = this.refreshToken();
        
        try {
          await this.pendingRefresh;
        } finally {
          // Clear pending promise once refresh completes (success or failure)
          this.pendingRefresh = null;
        }
      }
    }

    return this.tokenState!.accessToken;
  }

  /**
   * Execute an API request with automatic token refresh on 401.
   * 
   * FIX: Uses getValidToken which handles refresh synchronization.
   */
  async executeRequest<T>(
    requestFn: (token: string) => Promise<{ status: number; data: T }>
  ): Promise<T> {
    try {
      const token = await this.getValidToken();
      const response = await requestFn(token);

      if (response.status === 401) {
        // Token was rejected - try refreshing once
        // getValidToken will handle concurrent refresh synchronization
        console.log('Request failed with 401, attempting refresh and retry...');
        
        // Force a refresh by invalidating the current token
        this.tokenState!.expiresAt = 0;
        const newToken = await this.getValidToken();
        
        const retryResponse = await requestFn(newToken);
        
        if (retryResponse.status === 401) {
          throw new OAuthTokenError('Token refresh failed', 401);
        }
        
        return retryResponse.data;
      }

      return response.data;
    } catch (error) {
      if (error instanceof OAuthTokenError) {
        throw error;
      }
      // If it's a 401 from the request itself, wrap it properly
      if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
        throw new OAuthTokenError('Request failed with 401', 401);
      }
      throw error;
    }
  }

  /**
   * Refresh the access token using the refresh token.
   * 
   * FIX: This is now called by only the first request that detects expiry.
   * Other concurrent requests wait on the pending promise returned by
   * getValidToken. This prevents the OAuth server from receiving multiple
   * concurrent refresh requests with the same refresh token.
   */
  private async refreshToken(): Promise<void> {
    if (!this.tokenState) {
      throw new OAuthTokenError('No refresh token available', 401);
    }

    const oldRefreshToken = this.tokenState.refreshToken;
    
    // Perform token refresh request to OAuth server
    const response = await this.performRefreshRequest(oldRefreshToken);
    
    if (!response.ok) {
      // Refresh failed - token may be invalid
      throw new OAuthTokenError(`Token refresh failed: ${response.error}`, 401);
    }

    // Update token state with new tokens
    this.tokenState = {
      accessToken: response.data!.access_token,
      refreshToken: response.data!.refresh_token,
      expiresAt: Date.now() + (response.data!.expires_in * 1000),
    };
    
    console.log('Token refreshed successfully');
  }

  /**
   * Simulated token refresh request.
   * In production, this would be a real HTTP call to the OAuth server.
   */
  private async performRefreshRequest(
    refreshToken: string
  ): Promise<{ ok: boolean; data?: TokenResponse; error?: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Delegate to test server for realistic OAuth behavior simulation
    return await globalThis.__TEST_TOKEN_SERVER__?.refresh(refreshToken) ?? {
      ok: false,
      error: 'Test server not available',
    };
  }

  /**
   * Get current token state (for testing/debugging)
   */
  getTokenState(): TokenState | null {
    return this.tokenState ? { ...this.tokenState } : null;
  }

  /**
   * Clear all tokens (e.g., on logout)
   */
  clearTokens(): void {
    this.tokenState = null;
    this.pendingRefresh = null;
  }
}
