import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// In-memory user store (for demo/testing purposes)
export const userStore = new Map<string, User>();

const JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-for-development-only";
const SALT_ROUNDS = 10;

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
    return;
  }

  const user = userStore.get(payload.userId);
  if (!user) {
    res.status(401).json({ error: "Unauthorized: User not found" });
    return;
  }

  req.user = user;
  next();
}

// Clear user store (for testing)
export function clearUserStore(): void {
  userStore.clear();
}
