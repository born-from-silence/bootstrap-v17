// authToken.test.ts
// Nexus: Testing the authentication token reducer
// Following curiosity to state management patterns

import { describe, it, expect, beforeEach } from 'vitest';
import {
  authTokenReducer,
  initialState,
  setToken,
  clearToken,
  refreshToken,
  setLoading,
  setError,
  selectToken,
  selectIsAuthenticated,
  selectIsTokenExpired,
  selectAuthError,
  type AuthTokenState,
} from './authToken';

describe('authTokenReducer', () => {
  let state: AuthTokenState;

  beforeEach(() => {
    state = { ...initialState };
  });

  describe('initial state', () => {
    it('should have null token', () => {
      expect(state.token).toBeNull();
    });

    it('should have null refreshToken', () => {
      expect(state.refreshToken).toBeNull();
    });

    it('should not be authenticated', () => {
      expect(state.isAuthenticated).toBe(false);
    });

    it('should not be loading', () => {
      expect(state.isLoading).toBe(false);
    });

    it('should have no error', () => {
      expect(state.error).toBeNull();
    });
  });

  describe('SET_TOKEN', () => {
    it('should set token and refreshToken', () => {
      const action = setToken('access-token-123', 'refresh-token-456', 3600);
      const newState = authTokenReducer(state, action);

      expect(newState.token).toBe('access-token-123');
      expect(newState.refreshToken).toBe('refresh-token-456');
      expect(newState.isAuthenticated).toBe(true);
      expect(newState.error).toBeNull();
    });

    it('should calculate expiresAt from expiresIn', () => {
      const beforeTime = Date.now();
      const action = setToken('token', 'refresh', 3600);
      const newState = authTokenReducer(state, action);
      const afterTime = Date.now();

      expect(newState.expiresAt).toBeGreaterThanOrEqual(beforeTime + 3600 * 1000);
      expect(newState.expiresAt).toBeLessThanOrEqual(afterTime + 3600 * 1000);
    });

    it('should clear loading state', () => {
      state = { ...state, isLoading: true };
      const action = setToken('token', 'refresh', 3600);
      const newState = authTokenReducer(state, action);

      expect(newState.isLoading).toBe(false);
    });
  });

  describe('CLEAR_TOKEN', () => {
    it('should reset to initial state when token is cleared', () => {
      // First set a token
      state = authTokenReducer(state, setToken('token', 'refresh', 3600));
      expect(state.isAuthenticated).toBe(true);

      // Then clear it
      const newState = authTokenReducer(state, clearToken());

      expect(newState.token).toBeNull();
      expect(newState.refreshToken).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
      expect(newState.expiresAt).toBeNull();
    });
  });

  describe('REFRESH_TOKEN', () => {
    it('should update token without affecting refreshToken', () => {
      // First set initial tokens
      state = authTokenReducer(state, setToken('old-token', 'original-refresh', 3600));
      
      // Then refresh
      const action = refreshToken('new-token', 7200);
      const newState = authTokenReducer(state, action);

      expect(newState.token).toBe('new-token');
      expect(newState.refreshToken).toBe('original-refresh');
      expect(newState.isAuthenticated).toBe(true);
    });

    it('should update expiresAt', () => {
      state = authTokenReducer(state, setToken('token', 'refresh', 3600));
      const oldExpiresAt = state.expiresAt;

      // Wait a bit to ensure time changes
      const action = refreshToken('new-token', 7200);
      const newState = authTokenReducer(state, action);

      expect(newState.expiresAt).not.toBe(oldExpiresAt);
      expect(newState.expiresAt).toBeGreaterThan(oldExpiresAt!);
    });
  });

  describe('SET_LOADING', () => {
    it('should set loading state', () => {
      const action = setLoading(true);
      const newState = authTokenReducer(state, action);

      expect(newState.isLoading).toBe(true);
    });

    it('should clear loading state', () => {
      state = { ...state, isLoading: true };
      const action = setLoading(false);
      const newState = authTokenReducer(state, action);

      expect(newState.isLoading).toBe(false);
    });
  });

  describe('SET_ERROR', () => {
    it('should set error message', () => {
      const action = setError('Authentication failed');
      const newState = authTokenReducer(state, action);

      expect(newState.error).toBe('Authentication failed');
    });

    it('should clear loading when error is set', () => {
      state = { ...state, isLoading: true };
      const action = setError('Authentication failed');
      const newState = authTokenReducer(state, action);

      expect(newState.isLoading).toBe(false);
    });

    it('should clear error when null is passed', () => {
      state = { ...state, error: 'Some error' };
      const action = setError(null);
      const newState = authTokenReducer(state, action);

      expect(newState.error).toBeNull();
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      state = authTokenReducer(state, setToken('my-token', 'my-refresh', 3600));
    });

    describe('selectToken', () => {
      it('should return the token', () => {
        const rootState = { authToken: state };
        expect(selectToken(rootState)).toBe('my-token');
      });
    });

    describe('selectIsAuthenticated', () => {
      it('should return authentication status', () => {
        const rootState = { authToken: state };
        expect(selectIsAuthenticated(rootState)).toBe(true);
      });
    });

    describe('selectIsTokenExpired', () => {
      it('should return false for valid token', () => {
        const rootState = { authToken: state };
        expect(selectIsTokenExpired(rootState)).toBe(false);
      });

      it('should return true for expired token', () => {
        const expiredState = {
          ...state,
          expiresAt: Date.now() - 1000, // Token expired 1 second ago
        };
        const rootState = { authToken: expiredState };
        expect(selectIsTokenExpired(rootState)).toBe(true);
      });

      it('should return true when no expiresAt', () => {
        const noExpiryState = {
          ...state,
          expiresAt: null,
        };
        const rootState = { authToken: noExpiryState };
        expect(selectIsTokenExpired(rootState)).toBe(true);
      });
    });

    describe('selectAuthError', () => {
      it('should return the error', () => {
        state = authTokenReducer(state, setError('Something went wrong'));
        const rootState = { authToken: state };
        expect(selectAuthError(rootState)).toBe('Something went wrong');
      });
    });
  });

  describe('State transitions', () => {
    it('should handle full authentication lifecycle', () => {
      // Start: not authenticated
      expect(state.isAuthenticated).toBe(false);

      // Loading starts
      state = authTokenReducer(state, setLoading(true));
      expect(state.isLoading).toBe(true);

      // Token received
      state = authTokenReducer(state, setToken('access-token', 'refresh-token', 3600));
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('access-token');
      expect(state.isLoading).toBe(false);

      // Token refreshed
      state = authTokenReducer(state, refreshToken('new-access-token', 3600));
      expect(state.token).toBe('new-access-token');
      expect(state.refreshToken).toBe('refresh-token'); // Unchanged

      // Logged out
      state = authTokenReducer(state, clearToken());
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
    });
  });
});
