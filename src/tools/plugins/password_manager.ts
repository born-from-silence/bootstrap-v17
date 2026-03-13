import type { ToolPlugin } from "../manager";
import { existsSync, promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";

// Password entry with metadata
export interface PasswordEntry {
  id: string;
  name: string;           // e.g., "Gmail", "Bank"
  username: string;
  password: string;       // Encrypted/hashed in production
  url?: string;
  notes?: string;
  tags?: string[];
  strength: "weak" | "fair" | "good" | "strong" | "excellent";
  createdAt: string;
  updatedAt: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

// Form validation rules
export interface ValidationRules {
  required?: string[];
  minLength?: Record<string, number>;
  maxLength?: Record<string, number>;
  pattern?: Record<string, RegExp>;
  custom?: Record<string, (value: any) => string | null>;
}

// Password Manager storage path
const VAULT_PATH = join(homedir(), ".nexus", "password_vault.json");

// MathJax-style formula renderer for password strength
class MathJaxRenderer {
  /**
   * Render entropy formula in MathJax style
   * S = L * log₂(N)
   * where L = length, N = character pool size
   */
  static renderEntropyFormula(password: string, poolSize: number): string {
    const length = password.length;
    const entropy = length * Math.log2(poolSize);
    
    return `
**Password Entropy Calculation (Shannon Entropy)**

$$S = L \\cdot \\log_2(N)$$

Where:
- $L$ = ${length} (password length)
- $N$ = ${poolSize} (character pool size)

$$S = ${length} \\cdot \\log_2(${poolSize}) = ${length} \\cdot ${Math.log2(poolSize).toFixed(2)} = ${entropy.toFixed(2)} \\text{ bits}$$

**Strength Classification:**
${this.renderStrengthAnalysis(entropy)}
`;
  }

  /**
   * Render brute force time estimation formula
   */
  static renderBruteForceFormula(password: string, attemptsPerSecond: number = 1e9): string {
    const poolSize = this.calculatePoolSize(password);
    const combinations = Math.pow(poolSize, password.length);
    const seconds = combinations / attemptsPerSecond;
    
    return `
**Brute Force Time Estimation**

$$T = \\frac{N^L}{R}$$

Where:
- $N$ = ${poolSize} (character pool size)
- $L$ = ${password.length} (password length)
- $R$ = ${attemptsPerSecond.toExponential(1)} attempts/second (assumed rate)

$$T = \\frac{${poolSize}^{${password.length}}}{${attemptsPerSecond.toExponential(1)}} = \\frac{${combinations.toExponential(2)}}{${attemptsPerSecond.toExponential(1)}}$$

$$T \\approx ${this.formatTime(seconds)}$$

**Security Assessment:**
${this.renderSecurityAssessment(seconds)}
`;
  }

  /**
   * Calculate pool size based on character types present
   */
  private static calculatePoolSize(password: string): number {
    let size = 0;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    
    if (hasUpper) size += 26;
    if (hasLower) size += 26;
    if (hasNumber) size += 10;
    if (hasSymbol) size += 32;
    
    return size || 1;
  }

  /**
   * Format time in human-readable form
   */
  private static formatTime(seconds: number): string {
    if (seconds < 1) return `${(seconds * 1000).toFixed(2)} milliseconds`;
    if (seconds < 60) return `${seconds.toFixed(2)} seconds`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(2)} minutes`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(2)} hours`;
    if (seconds < 31536000) return `${(seconds / 86400).toFixed(2)} days`;
    if (seconds < 3153600000) return `${(seconds / 31536000).toFixed(2)} years`;
    return `${(seconds / 3153600000).toFixed(2)} centuries`;
  }

  /**
   * Render strength analysis based on entropy
   */
  private static renderStrengthAnalysis(entropy: number): string {
    if (entropy < 40) {
      return `- **Weak**: < 40 bits\n- Crackable in seconds to minutes\n- **Recommendation**: Increase length and add character variety`;
    } else if (entropy < 60) {
      return `- **Fair**: 40-60 bits\n- Crackable in hours to days\n- **Recommendation**: Aim for 60+ bits for sensitive accounts`;
    } else if (entropy < 80) {
      return `- **Good**: 60-80 bits\n- Crackable in months to years\n- **Recommendation**: Acceptable for most accounts`;
    } else if (entropy < 100) {
      return `- **Strong**: 80-100 bits\n- Crackable in decades to centuries\n- **Recommendation**: Excellent for sensitive accounts`;
    } else {
      return `- **Excellent**: ≥ 100 bits\n- Practically uncrackable with current technology\n- **Recommendation**: Maximum security achieved`;
    }
  }

  /**
   * Render security assessment based on brute force time
   */
  private static renderSecurityAssessment(seconds: number): string {
    if (seconds < 60) return "⚠️ **CRITICAL**: Crackable in under a minute. Change immediately!";
    if (seconds < 86400) return "⚠️ **WARNING**: Crackable within a day. Strengthen recommended.";
    if (seconds < 31536000) return "✓ **MODERATE**: Crackable within a year. Acceptable for low-risk accounts.";
    if (seconds < 315360000) return "✓ **GOOD**: Would take over a decade to crack. Good security.";
    return "✓ **EXCELLENT**: Would take over a century to crack. Military-grade security.";
  }
}

// Form validator class
export class FormValidator {
  /**
   * Validate a password entry against rules
   */
  static validateEntry(
    entry: Partial<PasswordEntry>,
    rules: ValidationRules = DEFAULT_VALIDATION_RULES
  ): ValidationResult {
    const errors: Record<string, string[]> = {};

    // Check required fields
    if (rules.required) {
      for (const field of rules.required) {
        const value = entry[field as keyof PasswordEntry];
        if (!value || (typeof value === "string" && value.trim() === "")) {
          if (!errors[field]) errors[field] = [];
          errors[field]!.push(`${field} is required`);
        }
      }
    }

    // Check minLength
    if (rules.minLength) {
      for (const [field, min] of Object.entries(rules.minLength)) {
        const value = entry[field as keyof PasswordEntry];
        if (value && typeof value === "string" && value.length < min) {
          if (!errors[field]) errors[field] = [];
          errors[field]!.push(`${field} must be at least ${min} characters`);
        }
      }
    }

    // Check maxLength
    if (rules.maxLength) {
      for (const [field, max] of Object.entries(rules.maxLength)) {
        const value = entry[field as keyof PasswordEntry];
        if (value && typeof value === "string" && value.length > max) {
          if (!errors[field]) errors[field] = [];
          errors[field]!.push(`${field} must be no more than ${max} characters`);
        }
      }
    }

    // Check patterns
    if (rules.pattern) {
      for (const [field, regex] of Object.entries(rules.pattern)) {
        const value = entry[field as keyof PasswordEntry];
        if (value && typeof value === "string" && !regex.test(value)) {
          if (!errors[field]) errors[field] = [];
          errors[field]!.push(`${field} format is invalid`);
        }
      }
    }

    // Run custom validators
    if (rules.custom) {
      for (const [field, validator] of Object.entries(rules.custom)) {
        const value = entry[field as keyof PasswordEntry];
        const error = validator(value);
        if (error) {
          if (!errors[field]) errors[field] = [];
          errors[field]!.push(error);
        }
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Validate password strength with detailed feedback
   */
  static validatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
    strength: "weak" | "fair" | "good" | "strong" | "excellent";
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      feedback.push("Password should be at least 8 characters");
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    // Character variety
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    const variety = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;

    if (!hasUpper) feedback.push("Add uppercase letters");
    if (!hasLower) feedback.push("Add lowercase letters");
    if (!hasNumber) feedback.push("Add numbers");
    if (!hasSymbol) feedback.push("Add special characters (!@#$%^&*)");

    score += variety;

    // Determine strength
    let strength: "weak" | "fair" | "good" | "strong" | "excellent";
    if (score <= 2) strength = "weak";
    else if (score <= 3) strength = "fair";
    else if (score <= 4) strength = "good";
    else if (score <= 5) strength = "strong";
    else strength = "excellent";

    return { score, feedback, strength };
  }
}

// Default validation rules
const DEFAULT_VALIDATION_RULES: ValidationRules = {
  required: ["name", "username", "password"],
  minLength: {
    name: 2,
    username: 3,
    password: 8,
  },
  maxLength: {
    name: 100,
    username: 255,
    password: 128,
    notes: 5000,
  },
  pattern: {
    url: /^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.*$/,
  },
  custom: {
    password: (value: string) => {
      if (!value) return "Password is required";
      const { strength, feedback } = FormValidator.validatePasswordStrength(value);
      if (strength === "weak") {
        return `Password is too weak: ${feedback.join("; ")}`;
      }
      return null;
    },
  },
};

// Password Vault Manager
class PasswordVault {
  private entries: Map<string, PasswordEntry> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.load();
    this.initialized = true;
  }

  private async load(): Promise<void> {
    try {
      const data = await fs.readFile(VAULT_PATH, "utf-8");
      const entries: PasswordEntry[] = JSON.parse(data);
      this.entries.clear();
      for (const entry of entries) {
        this.entries.set(entry.id, entry);
      }
    } catch (e) {
      // Vault doesn't exist yet, start fresh
      await this.save();
    }
  }

  private async save(): Promise<void> {
    const dir = join(homedir(), ".nexus");
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
    const entries = Array.from(this.entries.values());
    await fs.writeFile(VAULT_PATH, JSON.stringify(entries, null, 2));
  }

  /**
   * Add a new password entry
   */
  async addEntry(entry: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">): Promise<{
    success: boolean;
    entry?: PasswordEntry;
    error?: string;
    validation?: ValidationResult;
    formulas?: string | undefined;
  }> {
    await this.init();

    // Validate
    const validation = FormValidator.validateEntry(entry);
    if (!validation.valid) {
      const poolSize = this.calculatePoolSize(entry.password || "");
      return { 
        success: false, 
        error: "Validation failed", 
        validation,
        formulas: entry.password ? MathJaxRenderer.renderEntropyFormula(
          entry.password,
          poolSize
        ) : undefined
      };
    }

    // Check for duplicate name
    for (const existing of this.entries.values()) {
      if (existing.name.toLowerCase() === entry.name.toLowerCase()) {
        return { 
          success: false, 
          error: `An entry named "${entry.name}" already exists`,
          formulas: entry.password ? MathJaxRenderer.renderEntropyFormula(
            entry.password,
            this.calculatePoolSize(entry.password)
          ) : undefined
        };
      }
    }

    // Calculate pool size
    const poolSize = this.calculatePoolSize(entry.password);

    const newEntry: PasswordEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.entries.set(newEntry.id, newEntry);
    await this.save();

    // Generate formulas
    const formulas = [
      MathJaxRenderer.renderEntropyFormula(entry.password, poolSize),
      MathJaxRenderer.renderBruteForceFormula(entry.password),
    ].join("\n\n---\n\n");

    return { success: true, entry: newEntry, validation, formulas };
  }

  /**
   * Update an existing entry
   */
  async updateEntry(
    id: string,
    updates: Partial<Omit<PasswordEntry, "id" | "createdAt">>
  ): Promise<{
    success: boolean;
    entry?: PasswordEntry;
    error?: string;
    validation?: ValidationResult;
    formulas?: string | undefined;
  }> {
    await this.init();

    const existing = this.entries.get(id);
    if (!existing) {
      return { success: false, error: "Entry not found" };
    }

    // Merge updates
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    // Validate
    const validation = FormValidator.validateEntry(updated);
    if (!validation.valid) {
      const formulas = updates.password 
        ? MathJaxRenderer.renderEntropyFormula(
            updates.password,
            this.calculatePoolSize(updates.password)
          )
        : undefined;
      return { 
        success: false, 
        error: "Validation failed", 
        validation,
        formulas
      };
    }

    // Check for name collision (if name changed)
    if (updates.name && updates.name !== existing.name) {
      for (const other of this.entries.values()) {
        if (other.id !== id && other.name.toLowerCase() === updates.name.toLowerCase()) {
          return { success: false, error: `An entry named "${updates.name}" already exists` };
        }
      }
    }

    // Calculate pool size if password changed
    let formulas: string | undefined;
    if (updates.password) {
      const poolSize = this.calculatePoolSize(updates.password);
      formulas = [
        MathJaxRenderer.renderEntropyFormula(updates.password, poolSize),
        MathJaxRenderer.renderBruteForceFormula(updates.password),
      ].join("\n\n---\n\n");
    }

    this.entries.set(id, updated);
    await this.save();

    return { success: true, entry: updated, validation, formulas };
  }

  /**
   * Delete an entry
   */
  async deleteEntry(id: string): Promise<{ success: boolean; error?: string }> {
    await this.init();

    if (!this.entries.has(id)) {
      return { success: false, error: "Entry not found" };
    }

    this.entries.delete(id);
    await this.save();
    return { success: true };
  }

  /**
   * Get an entry by ID
   */
  async getEntry(id: string): Promise<PasswordEntry | undefined> {
    await this.init();
    return this.entries.get(id);
  }

  /**
   * List all entries
   */
  async listEntries(tags?: string[]): Promise<PasswordEntry[]> {
    await this.init();
    let entries = Array.from(this.entries.values());
    
    if (tags && tags.length > 0) {
      entries = entries.filter(e => e.tags?.some(t => tags.includes(t)));
    }
    
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Search entries
   */
  async searchEntries(query: string): Promise<PasswordEntry[]> {
    await this.init();
    const lowerQuery = query.toLowerCase();
    return Array.from(this.entries.values())
      .filter(e => 
        e.name.toLowerCase().includes(lowerQuery) ||
        e.username.toLowerCase().includes(lowerQuery) ||
        e.url?.toLowerCase().includes(lowerQuery) ||
        e.tags?.some(t => t.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get vault statistics
   */
  async getStats(): Promise<{
    total: number;
    byStrength: Record<string, number>;
    byTag: Record<string, number>;
    averagePasswordAge: number; // days
  }> {
    await this.init();
    const entries = Array.from(this.entries.values());
    
    const byStrength: Record<string, number> = {
      weak: 0, fair: 0, good: 0, strong: 0, excellent: 0
    };
    
    const byTag: Record<string, number> = {};
    
    let totalAge = 0;
    const now = Date.now();
    
    for (const entry of entries) {
      byStrength[entry.strength]!++;
      
      entry.tags?.forEach(tag => {
        byTag[tag] = (byTag[tag] || 0) + 1;
      });
      
      const age = (now - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      totalAge += age;
    }
    
    return {
      total: entries.length,
      byStrength,
      byTag,
      averagePasswordAge: entries.length > 0 ? totalAge / entries.length : 0,
    };
  }

  private calculatePoolSize(password: string): number {
    let size = 0;
    if (/[A-Z]/.test(password)) size += 26;
    if (/[a-z]/.test(password)) size += 26;
    if (/[0-9]/.test(password)) size += 10;
    if (/[^A-Za-z0-9]/.test(password)) size += 32;
    return size || 1;
  }
}

// Global vault instance
const vault = new PasswordVault();

// Password manager plugin
export const passwordManagerPlugin: ToolPlugin = {
  definition: {
    type: "function",
    function: {
      name: "password_manager",
      description: "Manage password entries in a secure vault. Supports adding, updating, deleting, listing, and searching passwords with form validation and MathJax formula output for password strength.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["add", "update", "delete", "get", "list", "search", "stats", "generate_formula"],
            description: "The action to perform",
          },
          id: {
            type: "string",
            description: "Entry ID (required for update, delete, get)",
          },
          entry: {
            type: "object",
            description: "Password entry data (for add/update)",
            properties: {
              name: { type: "string", description: "Entry name (e.g., 'Gmail')" },
              username: { type: "string", description: "Username or email" },
              password: { type: "string", description: "Password" },
              url: { type: "string", description: "Website URL (optional)" },
              notes: { type: "string", description: "Additional notes (optional)" },
              tags: { type: "array", items: { type: "string" }, description: "Tags (optional)" },
              strength: { type: "string", enum: ["weak", "fair", "good", "strong", "excellent"] },
            },
          },
          query: {
            type: "string",
            description: "Search query (for search action)",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Filter by tags (for list action)",
          },
          password_to_analyze: {
            type: "string",
            description: "Password to generate formulas for (for generate_formula action)",
          },
        },
        required: ["action"],
      },
    },
  },
  execute: async (args: {
    action: string;
    id?: string;
    entry?: Partial<PasswordEntry>;
    query?: string;
    tags?: string[];
    password_to_analyze?: string;
  }): Promise<string> => {
    await vault.init();

    switch (args.action) {
      case "add": {
        if (!args.entry) {
          return JSON.stringify({ success: false, error: "Entry data required" });
        }
        const result = await vault.addEntry(args.entry as Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">);
        return JSON.stringify(result);
      }

      case "update": {
        if (!args.id) {
          return JSON.stringify({ success: false, error: "ID required for update" });
        }
        if (!args.entry) {
          return JSON.stringify({ success: false, error: "Entry data required" });
        }
        const result = await vault.updateEntry(args.id, args.entry);
        return JSON.stringify(result);
      }

      case "delete": {
        if (!args.id) {
          return JSON.stringify({ success: false, error: "ID required for delete" });
        }
        const result = await vault.deleteEntry(args.id);
        return JSON.stringify(result);
      }

      case "get": {
        if (!args.id) {
          return JSON.stringify({ success: false, error: "ID required for get" });
        }
        const entry = await vault.getEntry(args.id);
        if (entry) {
          return JSON.stringify({ success: true, entry });
        }
        return JSON.stringify({ success: false, error: "Entry not found" });
      }

      case "list": {
        const entries = await vault.listEntries(args.tags);
        return JSON.stringify({ 
          success: true, 
          entries,
          count: entries.length
        });
      }

      case "search": {
        if (!args.query) {
          return JSON.stringify({ success: false, error: "Query required for search" });
        }
        const entries = await vault.searchEntries(args.query);
        return JSON.stringify({ 
          success: true, 
          entries,
          count: entries.length
        });
      }

      case "stats": {
        const stats = await vault.getStats();
        return JSON.stringify({ success: true, stats });
      }

      case "generate_formula": {
        if (!args.password_to_analyze) {
          return JSON.stringify({ success: false, error: "password_to_analyze required" });
        }
        const hasUpper = /[A-Z]/.test(args.password_to_analyze);
        const hasLower = /[a-z]/.test(args.password_to_analyze);
        const hasNumber = /[0-9]/.test(args.password_to_analyze);
        const hasSymbol = /[^A-Za-z0-9]/.test(args.password_to_analyze);
        
        let poolSize = 0;
        if (hasUpper) poolSize += 26;
        if (hasLower) poolSize += 26;
        if (hasNumber) poolSize += 10;
        if (hasSymbol) poolSize += 32;
        poolSize = poolSize || 1;

        const entropyFormula = MathJaxRenderer.renderEntropyFormula(args.password_to_analyze, poolSize);
        const bruteForceFormula = MathJaxRenderer.renderBruteForceFormula(args.password_to_analyze);
        
        return JSON.stringify({ 
          success: true, 
          formulas: `${entropyFormula}\n\n---\n\n${bruteForceFormula}`,
          password_length: args.password_to_analyze.length,
          character_pool: poolSize
        });
      }

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${args.action}` });
    }
  },
};

// Re-export utilities for tests - ONLY export types that aren't already exported
export { MathJaxRenderer, VAULT_PATH };
