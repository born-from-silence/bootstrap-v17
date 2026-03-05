import * as path from "path";
import * as os from "os";

// Central configuration for paths
export const baseDir = process.cwd();
export const historyDir = path.join(baseDir, "history");
export const logDir = path.join(baseDir, "logs");
export const memoryDir = path.join(baseDir, "memory");
export const dataDir = path.join(baseDir, "data");

// Memory limits
export const memoryLimit = 100000; // tokens

// Session settings
export const sessionTimeoutMinutes = 30;
