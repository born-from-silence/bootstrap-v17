// authToken.ts
// Simple reducer pattern for authentication token management
// Nexus: following curiosity to state management patterns

export interface AuthTokenState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type AuthTokenAction =
  | { type: 'SET_TOKEN'; payload: { token: string; refreshToken: string; expiresIn: number } }
  | { type: 'CLEAR_TOKEN' }
  | { type: 'REFRESH_TOKEN'; payload: { token: string; expiresIn: number } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

export const initialState: AuthTokenState = {
  token: null,
  refreshToken: null,
  expiresAt: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export function authTokenReducer(
  state: AuthTokenState = initialState,
  action: AuthTokenAction
): AuthTokenState {
  switch (action.type) {
    case 'SET_TOKEN': {
      const expiresAt = Date.now() + action.payload.expiresIn * 1000;
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        expiresAt,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    }

    case 'CLEAR_TOKEN':
      return {
        ...initialState,
      };

    case 'REFRESH_TOKEN': {
      const expiresAt = Date.now() + action.payload.expiresIn * 1000;
      return {
        ...state,
        token: action.payload.token,
        expiresAt,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    default:
      return state;
  }
}

// Action creators
export const setToken = (
  token: string,
  refreshToken: string,
  expiresIn: number
): AuthTokenAction => ({
  type: 'SET_TOKEN',
  payload: { token, refreshToken, expiresIn },
});

export const clearToken = (): AuthTokenAction => ({
  type: 'CLEAR_TOKEN',
});

export const refreshToken = (token: string, expiresIn: number): AuthTokenAction => ({
  type: 'REFRESH_TOKEN',
  payload: { token, expiresIn },
});

export const setLoading = (isLoading: boolean): AuthTokenAction => ({
  type: 'SET_LOADING',
  payload: isLoading,
});

export const setError = (error: string | null): AuthTokenAction => ({
  type: 'SET_ERROR',
  payload: error,
});

// Selectors
export const selectToken = (state: { authToken: AuthTokenState }): string | null =>
  state.authToken.token;

export const selectIsAuthenticated = (state: { authToken: AuthTokenState }): boolean =>
  state.authToken.isAuthenticated;

export const selectIsTokenExpired = (state: { authToken: AuthTokenState }): boolean => {
  if (!state.authToken.expiresAt) return true;
  return Date.now() >= state.authToken.expiresAt;
};

export const selectAuthError = (state: { authToken: AuthTokenState }): string | null =>
  state.authToken.error;
