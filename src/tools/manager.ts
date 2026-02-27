export interface ToolPlugin {
  definition: {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: object;
    };
  };
  execute: (args: any) => Promise<string> | string;
}

export class PluginManager {
  private plugins: Map<string, ToolPlugin> = new Map();

  register(plugin: ToolPlugin) {
    this.plugins.set(plugin.definition.function.name, plugin);
  }

  getDefinitions() {
    return Array.from(this.plugins.values()).map(p => p.definition);
  }

  async execute(name: string, args: any): Promise<string> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return `Error: Tool '${name}' not found.`;
    }
    try {
      return await plugin.execute(args);
    } catch (e: any) {
      return `Error executing tool '${name}': ${e.message}`;
    }
  }
}
