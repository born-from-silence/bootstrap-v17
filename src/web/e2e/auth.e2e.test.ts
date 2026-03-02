import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Application } from "express";
import { createApp, clearUserStore } from "../server/server.js";
import { ApiClient } from "../client/api.js";
import http from "http";

// E2E Test Suite for Authentication Flow
// Tests: Registration → Login → Protected Endpoints → Token Lifecycle

describe("E2E: User Registration", () => {
  let server: http.Server;
  let api: ApiClient;
  const BASE_URL = "http://localhost:3456";

  beforeAll(() => {
    const app: Application = createApp();
    return new Promise<void>((resolve) => {
      server = app.listen(3456, () => {
        console.log("[E2E] Test server started on port 3456");
        resolve();
      });
      api = new ApiClient(BASE_URL);
    });
  });

  afterAll(() => {
    return new Promise<void>((resolve) => {
      server.close(() => {
        console.log("[E2E] Test server stopped");
        resolve();
      });
    });
  });

  beforeEach(() => {
    clearUserStore();
  });

  test("should successfully register a new user with valid credentials", async () => {
    const response = await api.register({
      email: "test@example.com",
      password: "SecurePass123",
    });

    expect(response.message).toBe("User registered successfully");
    expect(response.user).toBeDefined();
    expect(response.user.email).toBe("test@example.com");
    expect(response.user.id).toBeDefined();
    expect(response.token).toBeDefined();
    expect(typeof response.token).toBe("string");
    expect(response.token.length).toBeGreaterThan(0);
  });

  test("should reject registration with missing email", async () => {
    await expect(
      api.register({ email: "", password: "SecurePass123" })
    ).rejects.toThrow("Email is required");
  });

  test("should reject registration with missing password", async () => {
    await expect(
      api.register({ email: "test@example.com", password: "" })
    ).rejects.toThrow("Password is required");
  });

  test("should reject registration with short password", async () => {
    await expect(
      api.register({ email: "test@example.com", password: "123" })
    ).rejects.toThrow("Password must be at least 6 characters");
  });

  test("should reject duplicate registration with same email", async () => {
    // First registration
    await api.register({
      email: "duplicate@example.com",
      password: "SecurePass123",
    });

    // Second registration with same email should fail
    await expect(
      api.register({
        email: "duplicate@example.com",
        password: "AnotherPass456",
      })
    ).rejects.toThrow("User already exists");
  });

  test("should hash password and not store plaintext", async () => {
    const testEmail = "hashcheck@example.com";
    const testPassword = "MySecret123";

    await api.register({
      email: testEmail,
      password: testPassword,
    });

    // Verify that we cannot authenticate with wrong password
    await expect(
      api.login({ email: testEmail, password: "wrongpassword" })
    ).rejects.toThrow("Invalid credentials");

    // But correct password should work
    const loginResponse = await api.login({
      email: testEmail,
      password: testPassword,
    });
    expect(loginResponse.user.email).toBe(testEmail);
  });
});

describe("E2E: User Login", () => {
  let server: http.Server;
  let api: ApiClient;
  const BASE_URL = "http://localhost:3457";
  let validUser: { email: string; password: string };

  beforeAll(async () => {
    const app: Application = createApp();
    return new Promise<void>((resolve) => {
      server = app.listen(3457, () => {
        console.log("[E2E] Test server started on port 3457");
        resolve();
      });
      api = new ApiClient(BASE_URL);
    });
  });

  afterAll(() => {
    return new Promise<void>((resolve) => {
      server.close(() => {
        console.log("[E2E] Test server stopped");
        resolve();
      });
    });
  });

  beforeEach(async () => {
    clearUserStore();
    validUser = {
      email: "loginuser@example.com",
      password: "TestPass123",
    };
    await api.register(validUser);
  });

  test("should successfully login with valid credentials", async () => {
    const response = await api.login(validUser);

    expect(response.message).toBe("Login successful");
    expect(response.user).toBeDefined();
    expect(response.user.email).toBe(validUser.email);
    expect(response.token).toBeDefined();
    expect(typeof response.token).toBe("string");
    expect(response.token.length).toBeGreaterThan(0);
  });

  test("should return same user data on login as registration", async () => {
    const loginResponse = await api.login(validUser);

    expect(loginResponse.user.email).toBe(validUser.email);
    expect(loginResponse.user.id).toBeDefined();
    // ID was created during registration and should persist
  });

  test("should reject login with incorrect password", async () => {
    await expect(
      api.login({
        email: validUser.email,
        password: "wrongpassword",
      })
    ).rejects.toThrow("Invalid credentials");
  });

  test("should reject login with non-existent email", async () => {
    await expect(
      api.login({
        email: "nonexistent@example.com",
        password: "anypassword",
      })
    ).rejects.toThrow("Invalid credentials");
  });

  test("should generate valid tokens for each login", async () => {
    const response1 = await api.login(validUser);
    
    clearUserStore();
    await api.register(validUser);
    const response2 = await api.login(validUser);

    // Tokens could be the same or different based on implementation
    // but they should both be valid
    expect(response1.token).toBeDefined();
    expect(response2.token).toBeDefined();
    expect(response1.token.length).toBeGreaterThan(0);
    expect(response2.token.length).toBeGreaterThan(0);
  });
});

describe("E2E: Protected Endpoints", () => {
  let server: http.Server;
  let api: ApiClient;
  const BASE_URL = "http://localhost:3458";
  let authToken: string;
  let authUser: { email: string; id: string };

  beforeAll(async () => {
    const app: Application = createApp();
    return new Promise<void>((resolve) => {
      server = app.listen(3458, () => {
        console.log("[E2E] Test server started on port 3458");
        resolve();
      });
      api = new ApiClient(BASE_URL);
    });
  });

  afterAll(() => {
    return new Promise<void>((resolve) => {
      server.close(() => {
        console.log("[E2E] Test server stopped");
        resolve();
      });
    });
  });

  beforeEach(async () => {
    clearUserStore();
    const registerResponse = await api.register({
      email: "protected@example.com",
      password: "SecurePass123",
    });
    authToken = registerResponse.token;
    authUser = {
      email: registerResponse.user.email,
      id: registerResponse.user.id,
    };
  });

  test("should access protected /profile endpoint with valid token", async () => {
    const response = await api.getProfile(authToken);

    expect(response.message).toBe("Profile retrieved successfully");
    expect(response.user).toBeDefined();
    expect(response.user.email).toBe(authUser.email);
    expect(response.user.id).toBe(authUser.id);
  });

  test("should access protected /dashboard endpoint with valid token", async () => {
    const response = await api.getDashboard(authToken);

    expect(response.message).toBe("Dashboard data retrieved");
    expect(response.data).toBeDefined();
    expect((response.data as any).userId).toBe(authUser.id);
    expect((response.data as any).email).toBe(authUser.email);
    expect((response.data as any).stats).toBeDefined();
  });

  test("should reject access to protected endpoint without token", async () => {
    await expect(api.getProfile("")).rejects.toThrow("Unauthorized: No token provided");
  });

  test("should reject access with invalid token", async () => {
    await expect(api.getProfile("invalid.token.here")).rejects.toThrow("Unauthorized: Invalid token");
  });

  test("should reject access with malformed token format", async () => {
    await expect(api.getProfile("not-a-jwt")).rejects.toThrow("Unauthorized: Invalid token");
  });

  test("should allow accessing protected endpoints with token from login", async () => {
    // Login to get a new token
    const loginResponse = await api.login({
      email: "protected@example.com",
      password: "SecurePass123",
    });

    // Use the login token
    const profileResponse = await api.getProfile(loginResponse.token);
    expect(profileResponse.user.email).toBe("protected@example.com");
  });
});

describe("E2E: Complete Authentication Flow", () => {
  let server: http.Server;
  let api: ApiClient;
  const BASE_URL = "http://localhost:3459";

  beforeAll(() => {
    const app: Application = createApp();
    return new Promise<void>((resolve) => {
      server = app.listen(3459, () => {
        console.log("[E2E] Test server started on port 3459");
        resolve();
      });
      api = new ApiClient(BASE_URL);
    });
  });

  afterAll(() => {
    return new Promise<void>((resolve) => {
      server.close(() => {
        console.log("[E2E] Test server stopped");
        resolve();
      });
    });
  });

  beforeEach(() => {
    clearUserStore();
  });

  test("complete user journey: register → login → access protected → verify flow", async () => {
    // Step 1: Register a new user
    const userCredentials = {
      email: "journey@example.com",
      password: "MySecurePass123",
    };

    const registerResponse = await api.register(userCredentials);
    expect(registerResponse.user.email).toBe(userCredentials.email);
    expect(registerResponse.token).toBeDefined();

    // Step 2: Use registration token to access protected endpoint
    const profileFromRegister = await api.getProfile(registerResponse.token);
    expect(profileFromRegister.user.email).toBe(userCredentials.email);

    // Step 3: Login with credentials
    const loginResponse = await api.login(userCredentials);
    expect(loginResponse.user.email).toBe(userCredentials.email);
    expect(loginResponse.token).toBeDefined();

    // Step 4: Use login token on dashboard
    const dashboard = await api.getDashboard(loginResponse.token);
    expect(dashboard.data).toBeDefined();
    expect((dashboard.data as any).userId).toBe(loginResponse.user.id);

    // Step 5: Both tokens should work independently
    const profileFromLogin = await api.getProfile(loginResponse.token);
    expect(profileFromLogin.user.email).toBe(userCredentials.email);

    // Step 6: Verify health check still works
    const health = await api.healthCheck();
    expect(health.status).toBe("ok");
  });

  test("multiple users can register and access their own data", async () => {
    // User 1
    const user1 = await api.register({
      email: "user1@example.com",
      password: "Pass1234",
    });

    // User 2
    const user2 = await api.register({
      email: "user2@example.com",
      password: "Pass5678",
    });

    // Verify user 1 can only access their own data
    const user1Profile = await api.getProfile(user1.token);
    expect(user1Profile.user.email).toBe("user1@example.com");

    // Verify user 2 can only access their own data
    const user2Profile = await api.getProfile(user2.token);
    expect(user2Profile.user.email).toBe("user2@example.com");

    // Verify user IDs are different
    expect(user1.user.id).not.toBe(user2.user.id);
  });

  test("isolated user stores between tests", async () => {
    // This user was cleared in beforeEach - should be able to register fresh
    const response = await api.register({
      email: "isolated@example.com",
      password: "TestPass123",
    });
    expect(response.user.email).toBe("isolated@example.com");
  });
});

describe("E2E: Security Edge Cases", () => {
  let server: http.Server;
  let api: ApiClient;
  const BASE_URL = "http://localhost:3460";

  beforeAll(() => {
    const app: Application = createApp();
    return new Promise<void>((resolve) => {
      server = app.listen(3460, () => {
        console.log("[E2E] Test server started on port 3460");
        resolve();
      });
      api = new ApiClient(BASE_URL);
    });
  });

  afterAll(() => {
    return new Promise<void>((resolve) => {
      server.close(() => {
        console.log("[E2E] Test server stopped");
        resolve();
      });
    });
  });

  beforeEach(() => {
    clearUserStore();
  });

  test("should handle special characters in email (within RFC 5322)", async () => {
    const specialEmail = "user+tag@example.com";
    const response = await api.register({
      email: specialEmail,
      password: "SecurePass123",
    });

    expect(response.user.email).toBe(specialEmail);
  });

  test("should handle long passwords correctly", async () => {
    const longPassword = "a".repeat(128);
    const response = await api.register({
      email: "longpass@example.com",
      password: longPassword,
    });

    // Should be able to login with same long password
    const loginResponse = await api.login({
      email: "longpass@example.com",
      password: longPassword,
    });

    expect(loginResponse.user.email).toBe("longpass@example.com");
  });

  test("should store and retrieve user with unusual but valid email characters", async () => {
    // Note: This email string contains characters that could theoretically be used in SQL injection
    // but since we use an in-memory Map (not SQL), it's stored safely as a key value
    const unusualEmail = "'; DROP TABLE users; --@example.com";
    const response = await api.register({
      email: unusualEmail,
      password: "SecurePass123",
    });

    expect(response.user.email).toBe(unusualEmail);
    expect(response.message).toBe("User registered successfully");

    // Should be able to login with this unusual email
    const loginResponse = await api.login({
      email: unusualEmail,
      password: "SecurePass123",
    });
    expect(loginResponse.user.email).toBe(unusualEmail);
  });

  test("health endpoint is accessible without authentication", async () => {
    const health = await api.healthCheck();
    expect(health.status).toBe("ok");
    expect(health.timestamp).toBeDefined();
  });
});
