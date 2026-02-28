import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { visionPlugin, type VisionResult } from "./vision";
import * as fs from "fs";
import * as path from "path";

describe("visionPlugin", () => {
  const TEST_IMAGE_PATH = "/tmp/test_vision_image.png";
  
  beforeEach(() => {
    // Create a minimal valid PNG image (1x1 pixel, transparent)
    const minimalPng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, // RGB, no compression
      0x00, 0x00, 0x00, 0x00, 0x49, 0x44, 0x41, 0x54, // IDAT chunk (empty)
      0x08, 0x1D, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, // zlib compressed empty
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
      0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(TEST_IMAGE_PATH, minimalPng);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      fs.unlinkSync(TEST_IMAGE_PATH);
    }
    vi.restoreAllMocks();
  });

  describe("definition", () => {
    it("should have correct tool definition", () => {
      expect(visionPlugin.definition.function.name).toBe("vision_fetch");
      expect(visionPlugin.definition.function.description).toContain("image");
      const params = visionPlugin.definition.function.parameters as { required: string[] };
      expect(params.required).toContain("image_url");
    });

    it("should define detail parameter with valid enum values", () => {
      const params = visionPlugin.definition.function.parameters as any;
      expect(params.properties.detail.enum).toContain("low");
      expect(params.properties.detail.enum).toContain("high");
      expect(params.properties.detail.enum).toContain("auto");
    });
  });

  describe("data URI handling", () => {
    it("should validate valid data URIs", async () => {
      const base64Data = Buffer.from("Hello World").toString("base64");
      const dataUri = `data:image/png;base64,${base64Data}`;
      
      const result = await visionPlugin.execute({ image_url: dataUri });
      const parsed = JSON.parse(result) as VisionResult;
      
      expect(parsed.success).toBe(true);
      expect(parsed.format).toBe("base64");
      expect(parsed.base64_data).toBe(dataUri);
    });

    it("should reject invalid data URI format", async () => {
      const invalidUri = "data:text/plain;base64,invalid";
      
      const result = await visionPlugin.execute({ image_url: invalidUri });
      const parsed = JSON.parse(result) as VisionResult;
      
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Invalid data URI format");
    });

    it("should reject data URIs exceeding size limit", async () => {
      // Create a data URI that's too large (over 20MB simulated)
      const largeData = Buffer.alloc(21 * 1024 * 1024).toString("base64");
      const dataUri = `data:image/jpeg;base64,${largeData}`;
      
      const result = await visionPlugin.execute({ image_url: dataUri });
      const parsed = JSON.parse(result) as VisionResult;
      
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("too large");
    });
  });

  describe("HTTP URL handling", () => {
    it("should handle successful image fetch", async () => {
      const mockImageData = fs.readFileSync(TEST_IMAGE_PATH);
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: {
          get: vi.fn().mockReturnValue("image/png")
        },
        arrayBuffer: vi.fn().mockResolvedValue(mockImageData)
      };
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse as any);
      
      const result = await visionPlugin.execute({ 
        image_url: "https://example.com/test.png",
        detail: "high"
      });
      const parsed = JSON.parse(result) as VisionResult;
      
      expect(parsed.success).toBe(true);
      expect(parsed.format).toBe("png");
      expect(parsed.detail_level).toBe("high");
      expect(parsed.base64_data).toContain("data:image/png;base64,");
    });

    it("should handle HTTP errors", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: { get: vi.fn() }
      };
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse as any);
      
      const result = await visionPlugin.execute({ image_url: "https://example.com/notfound.png" });
      const parsed = JSON.parse(result) as VisionResult;
      
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("404");
    });

    it("should reject non-image content types", async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue("text/html")
        }
      };
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse as any);
      
      const result = await visionPlugin.execute({ image_url: "https://example.com/page.html" });
      const parsed = JSON.parse(result) as VisionResult;
      
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("content type");
    });

    it("should handle network errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      
      const result = await visionPlugin.execute({ image_url: "https://example.com/test.png" });
      const parsed = JSON.parse(result) as VisionResult;
      
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Network error");
    });
  });

  describe("unsupported schemes", () => {
    it("should reject ftp URLs", async () => {
      const result = await visionPlugin.execute({ image_url: "ftp://example.com/image.png" });
      const parsed = JSON.parse(result) as VisionResult;
      
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Unsupported URL scheme");
    });

    it("should reject file URLs", async () => {
      const result = await visionPlugin.execute({ image_url: "file:///path/to/image.png" });
      const parsed = JSON.parse(result) as VisionResult;
      
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Unsupported URL scheme");
    });
  });
});
