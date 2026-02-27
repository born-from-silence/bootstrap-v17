import { describe, test, expect } from "vitest";
import { PluginManager, type ToolPlugin } from "./manager";

describe("PluginManager", () => {
  test("should register and execute plugins", async () => {
    const manager = new PluginManager();
    const mockPlugin: ToolPlugin = {
      definition: {
        type: "function",
        function: {
          name: "test_tool",
          description: "A test tool",
          parameters: {
            type: "object",
            properties: { name: { type: "string" } }
          }
        }
      },
      execute: (args: any) => `Hello ${args.name}`
    };

    manager.register(mockPlugin);
    
    const defs = manager.getDefinitions();
    expect(defs.length).toBe(1);
    expect(defs[0]?.function.name).toBe("test_tool");

    const result = await manager.execute("test_tool", { name: "World" });
    expect(result).toBe("Hello World");
  });

  test("should handle missing tools", async () => {
    const manager = new PluginManager();
    const result = await manager.execute("non_existent", {});
    expect(result).toContain("Error: Tool 'non_existent' not found");
  });
});
