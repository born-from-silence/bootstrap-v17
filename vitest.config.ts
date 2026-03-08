import { defineConfig } from "vitest/config";
import path from "node:path";
import os from "node:os";

export default defineConfig({
  test: {
    testTimeout: 15000,
    setupFiles: ["./src/test-setup.ts"],
    isolate: true,
    pool: "forks",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/history/**",
      "**/logs/**",
      "**/ltm/**"
    ]
  },
});
