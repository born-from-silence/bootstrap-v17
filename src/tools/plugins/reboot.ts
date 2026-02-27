import { execSync } from "node:child_process";
import type { ToolPlugin } from "../manager";

export const rebootPlugin: ToolPlugin = {
  definition: {
    type: "function",
    function: {
      name: "reboot_substrate",
      description: "Perform a mandatory preflight check (compile + test) and restart the process. Use after verifying and committing new logic. Current session context will be stored on disk, and the process will exit to allow the watchdog to restart it with the new code/soul.",
      parameters: {
        type: "object",
        properties: {
          force: { type: "boolean", description: "Bypass preflight check (DANGEROUS: only for emergency recovery)" }
        },
      },
    },
  },
  execute: (args: { force?: boolean }) => {
    // Recursion Guard: If we are already running tests, do NOT run preflight again.
    const isTesting = process.env.NODE_ENV === "test";

    if (!args.force && !isTesting) {
      try {
        console.log("[REBOOT] Running mandatory preflight check (npm run preflight)...");
        execSync("npm run preflight", { encoding: "utf-8", stdio: "pipe" });
      } catch (err: any) {
        console.error("[REBOOT] Preflight failed. Restart cancelled.");
        return `Error: Preflight check failed. You MUST fix compilation or test errors before rebooting.\n${err.stdout || ""}\n${err.stderr || ""}`;
      }
    } else if (isTesting) {
      console.log("[REBOOT] Preflight skipped (Recursion Guard: Test environment detected)");
    }

    console.log("Self-requested reboot. Closing session...");
    return "REBOOTING";
  }
};
