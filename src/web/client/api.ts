import type { User } from "../types.js";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error((data as ApiError).error || `Registration failed: ${response.status}`);
    }

    return data as AuthResponse;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error((data as ApiError).error || `Login failed: ${response.status}`);
    }

    return data as AuthResponse;
  }

  async getProfile(token: string): Promise<{ message: string; user: User }> {
    const response = await fetch(`${this.baseUrl}/api/protected/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error((data as ApiError).error || `Failed to get profile: ${response.status}`);
    }

    return data as { message: string; user: User };
  }

  async getDashboard(token: string): Promise<{ message: string; data: unknown }> {
    const response = await fetch(`${this.baseUrl}/api/protected/dashboard`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error((data as ApiError).error || `Failed to get dashboard: ${response.status}`);
    }

    return data as { message: string; data: unknown };
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/api/health`);
    return response.json();
  }
}

// Singleton instance
export const api = new ApiClient();
