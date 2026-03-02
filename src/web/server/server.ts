import express, { type Request, type Response, type Application } from "express";
import cors from "cors";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateId,
  authMiddleware,
  userStore,
  type AuthenticatedRequest,
  type User,
  clearUserStore,
} from "./auth.js";

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // User registration endpoint
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      if (!password || typeof password !== "string") {
        res.status(400).json({ error: "Password is required" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      // Check if user already exists
      const existingUser = Array.from(userStore.values()).find(
        (u) => u.email === email
      );
      if (existingUser) {
        res.status(409).json({ error: "User already exists" });
        return;
      }

      // Create new user
      const userId = generateId();
      const passwordHash = await hashPassword(password);
      const newUser: User = {
        id: userId,
        email,
        passwordHash,
        createdAt: new Date(),
      };

      userStore.set(userId, newUser);

      const token = generateToken(newUser);

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: userId,
          email: newUser.email,
          createdAt: newUser.createdAt.toISOString(),
        },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      if (!password || typeof password !== "string") {
        res.status(400).json({ error: "Password is required" });
        return;
      }

      // Find user
      const user = Array.from(userStore.values()).find((u) => u.email === email);
      if (!user) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const token = generateToken(user);

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Protected endpoint - requires authentication
  app.get(
    "/api/protected/profile",
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      res.json({
        message: "Profile retrieved successfully",
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
      });
    }
  );

  // Protected endpoint - dashboard data
  app.get(
    "/api/protected/dashboard",
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      res.json({
        message: "Dashboard data retrieved",
        data: {
          userId: user.id,
          email: user.email,
          stats: {
            loginCount: 1,
            lastActive: new Date().toISOString(),
            accountAge: Date.now() - user.createdAt.getTime(),
          },
        },
      });
    }
  );

  return app;
}

// Re-export for testing
export { clearUserStore, userStore };
