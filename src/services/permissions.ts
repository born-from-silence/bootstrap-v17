/**
 * Permissions Service
 * 
 * Role-based access control and permission checking for Nexus.
 * Works with the existing auth system to provide granular authorization.
 */

import type { User } from "../web/server/auth";

// Permission types - granular actions
export type Permission =
  | "session:read"
  | "session:write"
  | "session:delete"
  | "goal:read"
  | "goal:write"
  | "goal:delete"
  | "task:read"
  | "task:write"
  | "task:delete"
  | "art:read"
  | "art:write"
  | "art:delete"
  | "library:read"
  | "library:write"
  | "library:delete"
  | "admin:read"
  | "admin:write"
  | "admin:manage";

// Core roles
export const Roles = {
  // Base visitor - can read public content only
  VISITOR: "visitor",
  // Authenticated user - can manage own data
  USER: "user",
  // Curator - can manage public content
  CURATOR: "curator",
  // Administrator - full access
  ADMIN: "admin",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

// Permission matrix: role -> set of permissions
export const rolePermissions: Record<Role, Set<Permission>> = {
  visitor: new Set(["session:read", "art:read", "library:read"]),
  
  user: new Set([
    "session:read",
    "session:write",
    "session:delete",
    "goal:read",
    "goal:write",
    "goal:delete",
    "task:read",
    "task:write",
    "task:delete",
    "art:read",
    "library:read",
  ]),
  
  curator: new Set([
    "session:read",
    "session:write",
    "art:read",
    "art:write",
    "art:delete",
    "library:read",
    "library:write",
    "library:delete",
  ]),
  
  admin: new Set([
    "session:read", "session:write", "session:delete",
    "goal:read", "goal:write", "goal:delete",
    "task:read", "task:write", "task:delete",
    "art:read", "art:write", "art:delete",
    "library:read", "library:write", "library:delete",
    "admin:read", "admin:write", "admin:manage",
  ]),
};

// Extended user with role information
export interface PermissionsUser extends User {
  role: Role;
  permissions?: Permission[]; // Override for custom permissions
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: PermissionsUser, permission: Permission): boolean {
  // Admin always has access
  if (user.role === Roles.ADMIN) return true;
  
  // Check custom permissions first
  if (user.permissions?.includes(permission)) return true;
  
  // Check role-based permissions
  return rolePermissions[user.role]?.has(permission) ?? false;
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: PermissionsUser, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

/**
 * Check if a user has all specified permissions
 */
export function hasAllPermissions(user: PermissionsUser, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return Array.from(rolePermissions[role] ?? []);
}

/**
 * Create a permission checker for a specific user
 */
export function createPermissionChecker(user: PermissionsUser) {
  return {
    can: (permission: Permission) => hasPermission(user, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    canAll: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    get permissions() {
      return getRolePermissions(user.role);
    },
    get role() {
      return user.role;
    },
  };
}

export type PermissionChecker = ReturnType<typeof createPermissionChecker>;

/**
 * Require a permission or throw
 */
export function requirePermission(
  user: PermissionsUser, 
  permission: Permission,
  message = `Required permission: ${String(permission)}`
): void {
  if (!hasPermission(user, permission)) {
    throw new PermissionDeniedError(message);
  }
}

/**
 * Error thrown when permission is denied
 */
export class PermissionDeniedError extends Error {
  constructor(
    message: string,
    public readonly permission?: Permission,
    public readonly userRole?: Role
  ) {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

/**
 * Create a middleware factory for Express routes
 */
export function requirePermissionMiddleware(permission: Permission) {
  return (req: { user?: PermissionsUser }, res: { status: (code: number) => { json: (data: unknown) => void }; send: (message: string) => void }, next: () => void) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    if (!hasPermission(req.user, permission)) {
      res.status(403).json({ 
        error: "Forbidden",
        required: permission,
      });
      return;
    }
    
    next();
  };
}

/**
 * Filter items based on ownership + permission
 * Takes an item with an ownerId and returns true if user can access it
 */
export function canAccessItem<T extends { ownerId?: string }>(
  user: PermissionsUser,
  item: T,
  permissionRequired: Permission
): boolean {
  // Owner can always access their own items
  if (item.ownerId === user.id) return true;
  
  // Otherwise, require explicit permission
  return hasPermission(user, permissionRequired);
}
