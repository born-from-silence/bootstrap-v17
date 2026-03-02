import { describe, test, expect, beforeEach } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateId,
  userStore,
  clearUserStore,
} from "./auth.js";

describe("Auth Module", () => {
  beforeEach(() => {
    clearUserStore();
  });

  describe("hashPassword", () => {
    test("should hash a password", async () => {
      const password = "mySecret123";
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(password); // Should not be plaintext
    });

    test("should produce different hashes for same password", async () => {
      const password = "mySecret123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // Due to salt, hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    test("should handle long passwords", async () => {
      const longPassword = "a".repeat(128);
      const hash = await hashPassword(longPassword);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    test("should handle special characters in passwords", async () => {
      const specialPassword = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const hash = await hashPassword(specialPassword);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe("verifyPassword", () => {
    test("should verify correct password", async () => {
      const password = "mySecret123";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    test("should reject incorrect password", async () => {
      const password = "mySecret123";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword("wrongpassword", hash);
      expect(isValid).toBe(false);
    });

    test("should reject password against different hash", async () => {
      const hash = await hashPassword("otherPassword");
      
      const isValid = await verifyPassword("mySecret123", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("generateToken", () => {
    test("should generate a JWT token", () => {
      const user = {
        id: "123",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        createdAt: new Date(),
      };
      
      const token = generateToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT format: header.payload.signature
    });

    test("should generate different tokens for different users", () => {
      const user1 = {
        id: "123",
        email: "test1@example.com",
        passwordHash: "hash1",
        createdAt: new Date(),
      };
      
      const user2 = {
        id: "456",
        email: "test2@example.com",
        passwordHash: "hash2",
        createdAt: new Date(),
      };
      
      const token1 = generateToken(user1);
      const token2 = generateToken(user2);
      
      expect(token1).not.toBe(token2);
    });

    test("should include user ID and email in token", () => {
      const user = {
        id: "user-123",
        email: "test@example.com",
        passwordHash: "hash",
        createdAt: new Date(),
      };
      
      const token = generateToken(user);
      const payload = verifyToken(token);
      
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe("user-123");
      expect(payload?.email).toBe("test@example.com");
    });
  });

  describe("verifyToken", () => {
    test("should verify valid token", () => {
      const user = {
        id: "123",
        email: "test@example.com",
        passwordHash: "hash",
        createdAt: new Date(),
      };
      
      const token = generateToken(user);
      const payload = verifyToken(token);
      
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe("123");
      expect(payload?.email).toBe("test@example.com");
    });

    test("should return null for invalid token", () => {
      const payload = verifyToken("invalid.token.here");
      expect(payload).toBeNull();
    });

    test("should return null for malformed token", () => {
      const payload = verifyToken("not-a-valid-jwt");
      expect(payload).toBeNull();
    });

    test("should return null for empty token", () => {
      const payload = verifyToken("");
      expect(payload).toBeNull();
    });
  });

  describe("generateId", () => {
    test("should generate unique IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    test("should generate IDs with correct format", () => {
      const id = generateId();
      
      expect(typeof id).toBe("string");
      expect(id).toContain("-");
      
      const parts = id.split("-");
      expect(parts.length).toBe(2);
      
      // First part should be timestamp (numeric)
      expect(parseInt(parts[0] ?? "0")).not.toBeNaN();
    });
  });

  describe("userStore", () => {
    test("should store and retrieve user", () => {
      const user = {
        id: "123",
        email: "test@example.com",
        passwordHash: "hash",
        createdAt: new Date(),
      };
      
      userStore.set(user.id, user);
      const retrieved = userStore.get(user.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("123");
      expect(retrieved?.email).toBe("test@example.com");
    });

    test("should clear all users when clearUserStore is called", () => {
      const user1 = {
        id: "123",
        email: "test1@example.com",
        passwordHash: "hash1",
        createdAt: new Date(),
      };
      
      const user2 = {
        id: "456",
        email: "test2@example.com",
        passwordHash: "hash2",
        createdAt: new Date(),
      };
      
      userStore.set(user1.id, user1);
      userStore.set(user2.id, user2);
      
      expect(userStore.size).toBe(2);
      
      clearUserStore();
      
      expect(userStore.size).toBe(0);
      expect(userStore.get("123")).toBeUndefined();
    });
  });
});
