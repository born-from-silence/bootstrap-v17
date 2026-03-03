import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildDashboardData, economicRouter } from "./economic_dashboard.js";
import express from "express";
import request from "supertest";

describe("Economic Dashboard API", () => {
  describe("buildDashboardData", () => {
    it("should return dashboard data structure", async () => {
      const data = await buildDashboardData();
      
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("sources");
      expect(data).toHaveProperty("overview");
      expect(data).toHaveProperty("assets");
      expect(data).toHaveProperty("volatilitySignal");
    });

    it("should have correct assets structure", async () => {
      const data = await buildDashboardData();
      
      expect(data.assets).toHaveProperty("bitcoin");
      expect(data.assets).toHaveProperty("ethereum");
      expect(data.assets).toHaveProperty("sp500");
      expect(data.assets).toHaveProperty("nasdaq");
      expect(data.assets).toHaveProperty("vix");
    });

    it("should have valid trend values", async () => {
      const data = await buildDashboardData();
      const validTrends = ["up", "down", "sideways", "unknown"];
      
      Object.values(data.assets).forEach((asset: any) => {
        expect(validTrends).toContain(asset.trend);
      });
    });

    it("should have valid volatility signal", async () => {
      const data = await buildDashboardData();
      const validSignals = ["high", "moderate", "low", "unknown"];
      
      expect(validSignals).toContain(data.volatilitySignal);
    });

    it("should have valid sources flags", async () => {
      const data = await buildDashboardData();
      
      expect(typeof data.sources.crypto).toBe("boolean");
      expect(typeof data.sources.indices).toBe("boolean");
    });

    it("should have overview with snapshot info", async () => {
      const data = await buildDashboardData();
      
      expect(typeof data.overview.totalSnapshots).toBe("number");
      expect(data.overview.totalSnapshots).toBeGreaterThanOrEqual(0);
      expect(data.overview).toHaveProperty("snapshotRange");
    });

    it("each asset should have required fields", async () => {
      const data = await buildDashboardData();
      
      Object.values(data.assets).forEach((asset: any) => {
        expect(asset).toHaveProperty("symbol");
        expect(asset).toHaveProperty("name");
        expect(asset).toHaveProperty("currentValue");
        expect(asset).toHaveProperty("history");
        expect(asset).toHaveProperty("trend");
        expect(typeof asset.symbol).toBe("string");
        expect(typeof asset.name).toBe("string");
        expect(Array.isArray(asset.history)).toBe(true);
      });
    });
  });

  describe("API Endpoints", () => {
    let app: express.Application;

    beforeAll(() => {
      app = express();
      app.use("/api/economic", economicRouter);
    });

    it("GET /api/economic/dashboard should return dashboard data", async () => {
      const response = await request(app)
        .get("/api/economic/dashboard")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty("assets");
    });

    it("GET /api/economic/summary should return condensed data", async () => {
      const response = await request(app)
        .get("/api/economic/summary")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("bitcoin");
      expect(response.body.data).toHaveProperty("sp500");
      expect(response.body.data).toHaveProperty("vix");
      expect(response.body.data).toHaveProperty("volatility");
    });

    it("GET /api/economic/snapshots should return snapshot list", async () => {
      const response = await request(app)
        .get("/api/economic/snapshots")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.count).toBe("number");
      expect(Array.isArray(response.body.snapshots)).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      // API should still return structure even with no data
      const response = await request(app)
        .get("/api/economic/dashboard")
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
