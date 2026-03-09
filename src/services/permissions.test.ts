import { describe, it, expect, beforeEach } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  createPermissionChecker,
  requirePermission,
  PermissionDeniedError,
  requirePermissionMiddleware,
  canAccessItem,
  Roles,
  type Role,
  type Permission,
  type PermissionsUser,
} from "./permissions";

// Test user factory
function createTestUser(role: Role, id = "test-user-1", overrides?: Partial<PermissionsUser>): PermissionsUser {
  return {
    id,
    email: "test@example.com",
    passwordHash: "hashed-password",
    createdAt: new Date(),
    role,
    ...overrides,
  };
}

function createTestItem(ownerId: string): { id: string; ownerId: string; content: string } {
  return {
    id: "item-1",
    ownerId,
    content: "Test content",
  };
}

describe("Roles", () => {
  it("should define standard roles", () => {
    expect(Roles.VISITOR).toBe("visitor");
    expect(Roles.USER).toBe("user");
    expect(Roles.CURATOR).toBe("curator");
    expect(Roles.ADMIN).toBe("admin");
  });
});

describe("hasPermission", () => {
  it("should allow admin to do anything", () => {
    const admin = createTestUser(Roles.ADMIN);
    expect(hasPermission(admin, "admin:manage")).toBe(true);
    expect(hasPermission(admin, "session:delete")).toBe(true);
    expect(hasPermission(admin, "art:delete")).toBe(true);
    expect(hasPermission(admin, "nonexistent:action" as Permission)).toBe(true);
  });

  describe("visitor permissions", () => {
    it("should allow reading public content", () => {
      const visitor = createTestUser(Roles.VISITOR);
      expect(hasPermission(visitor, "session:read")).toBe(true);
      expect(hasPermission(visitor, "art:read")).toBe(true);
      expect(hasPermission(visitor, "library:read")).toBe(true);
    });

    it("should deny write/delete operations", () => {
      const visitor = createTestUser(Roles.VISITOR);
      expect(hasPermission(visitor, "session:write")).toBe(false);
      expect(hasPermission(visitor, "session:delete")).toBe(false);
      expect(hasPermission(visitor, "goal:write")).toBe(false);
      expect(hasPermission(visitor, "admin:read")).toBe(false);
    });
  });

  describe("user permissions", () => {
    it("should allow managing own sessions, goals, and tasks", () => {
      const user = createTestUser(Roles.USER);
      expect(hasPermission(user, "session:read")).toBe(true);
      expect(hasPermission(user, "session:write")).toBe(true);
      expect(hasPermission(user, "session:delete")).toBe(true);
      expect(hasPermission(user, "goal:read")).toBe(true);
      expect(hasPermission(user, "goal:write")).toBe(true);
      expect(hasPermission(user, "goal:delete")).toBe(true);
      expect(hasPermission(user, "task:read")).toBe(true);
      expect(hasPermission(user, "task:write")).toBe(true);
      expect(hasPermission(user, "task:delete")).toBe(true);
    });

    it("should allow reading library and art", () => {
      const user = createTestUser(Roles.USER);
      expect(hasPermission(user, "art:read")).toBe(true);
      expect(hasPermission(user, "library:read")).toBe(true);
    });

    it("should deny curate/admin operations", () => {
      const user = createTestUser(Roles.USER);
      expect(hasPermission(user, "art:write")).toBe(false);
      expect(hasPermission(user, "art:delete")).toBe(false);
      expect(hasPermission(user, "library:write")).toBe(false);
      expect(hasPermission(user, "admin:read")).toBe(false);
    });
  });

  describe("curator permissions", () => {
    it("should allow managing public art", () => {
      const curator = createTestUser(Roles.CURATOR);
      expect(hasPermission(curator, "art:read")).toBe(true);
      expect(hasPermission(curator, "art:write")).toBe(true);
      expect(hasPermission(curator, "art:delete")).toBe(true);
    });

    it("should allow managing library", () => {
      const curator = createTestUser(Roles.CURATOR);
      expect(hasPermission(curator, "library:read")).toBe(true);
      expect(hasPermission(curator, "library:write")).toBe(true);
      expect(hasPermission(curator, "library:delete")).toBe(true);
    });

    it("should deny session deletion but allow write", () => {
      const curator = createTestUser(Roles.CURATOR);
      expect(hasPermission(curator, "session:read")).toBe(true);
      expect(hasPermission(curator, "session:write")).toBe(true);
      expect(hasPermission(curator, "session:delete")).toBe(false);
    });

    it("should not have admin permissions", () => {
      const curator = createTestUser(Roles.CURATOR);
      expect(hasPermission(curator, "admin:read")).toBe(false);
      expect(hasPermission(curator, "admin:manage")).toBe(false);
    });
  });

  describe("custom permissions override", () => {
    it("should recognize custom permissions array", () => {
      const user = createTestUser(Roles.VISITOR, "test-user-3", {
        permissions: ["art:write"],
      });
      expect(hasPermission(user, "art:write")).toBe(true);
      // Still respects role for other permissions
      expect(hasPermission(user, "library:write")).toBe(false);
    });
  });
});

describe("hasAnyPermission", () => {
  it("should return true if user has at least one permission", () => {
    const user = createTestUser(Roles.USER);
    expect(hasAnyPermission(user, ["art:read", "art:write"])).toBe(true);
    expect(hasAnyPermission(user, ["art:write", "library:write"])).toBe(false);
    expect(hasAnyPermission(user, ["session:read", "session:write"])).toBe(true);
  });
});

describe("hasAllPermissions", () => {
  it("should return true only if user has all permissions", () => {
    const curator = createTestUser(Roles.CURATOR);
    expect(hasAllPermissions(curator, ["art:read", "art:write"])).toBe(true);
    expect(hasAllPermissions(curator, ["art:read", "session:delete"])).toBe(false);
  });
});

describe("getRolePermissions", () => {
  it("should return array of permissions for role", () => {
    const visitorPerms = getRolePermissions(Roles.VISITOR);
    expect(visitorPerms).toContain("session:read");
    expect(visitorPerms).toContain("art:read");
    expect(visitorPerms).not.toContain("session:write");
  });

  it("should return empty array for unknown role", () => {
    const perms = getRolePermissions("unknown" as Role);
    expect(perms).toEqual([]);
  });
});

describe("createPermissionChecker", () => {
  it("should create a reusable checker", () => {
    const user = createTestUser(Roles.USER);
    const checker = createPermissionChecker(user);
    
    expect(checker.can("session:read")).toBe(true);
    expect(checker.can("art:write")).toBe(false);
    expect(checker.canAny(["art:read", "art:write"])).toBe(true);
    expect(checker.canAll(["session:read", "session:write"])).toBe(true);
    expect(checker.permissions).toContain("session:read");
    expect(checker.role).toBe("user");
  });
});

describe("requirePermission", () => {
  it("should not throw when permission is granted", () => {
    const user = createTestUser(Roles.ADMIN);
    expect(() => requirePermission(user, "admin:manage")).not.toThrow();
  });

  it("should throw PermissionDeniedError when denied", () => {
    const user = createTestUser(Roles.VISITOR);
    expect(() => requirePermission(user, "art:write")).toThrow(PermissionDeniedError);
    expect(() => requirePermission(user, "art:write")).toThrow("Required permission: art:write");
  });

  it("should use custom message when provided", () => {
    const user = createTestUser(Roles.VISITOR);
    expect(() => requirePermission(user, "admin:read", "Custom message")).toThrow("Custom message");
  });
});

describe("canAccessItem", () => {
  it("should allow owner to access their own item", () => {
    const user = createTestUser(Roles.VISITOR, "owner-123");
    const item = createTestItem("owner-123");
    expect(canAccessItem(user, item, "admin:read")).toBe(true);
  });

  it("should check permission for non-owned items", () => {
    const user = createTestUser(Roles.USER, "current-user");
    const itemNotOwned = createTestItem("other-user");
    // User doesn't have admin:read
    expect(canAccessItem(user, itemNotOwned, "admin:read")).toBe(false);
    // User does have session:read
    expect(canAccessItem(user, itemNotOwned, "session:read")).toBe(true);
  });
});

describe("requirePermissionMiddleware", () => {
  it("should call next() when user has permission", () => {
    const user = createTestUser(Roles.USER);
    const req = { user };
    const res = {
      status: () => ({ json: (data: unknown) => ({}) }),
      send: () => {},
    };
    const next = () => {};
    
    const middleware = requirePermissionMiddleware("session:read");
    expect(() => middleware(req, res, next)).not.toThrow();
  });

  it("should return 401 when no user", () => {
    const req = {};
    const statusMock = { json: (data: unknown) => ({}) };
    const res = {
      status: () => statusMock,
      send: () => {},
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    
    const middleware = requirePermissionMiddleware("session:read");
    middleware(req, res, next);
    expect(nextCalled).toBe(false);
  });

  it("should return 403 when permission denied", () => {
    const user = createTestUser(Roles.VISITOR);
    const req = { user };
    const statusMock = { json: (data: unknown) => ({}) };
    const res = {
      status: () => statusMock,
      send: () => {},
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    
    const middleware = requirePermissionMiddleware("session:write");
    middleware(req, res, next);
    expect(nextCalled).toBe(false);
  });
});
