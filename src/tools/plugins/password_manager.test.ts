import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { 
  FormValidator, 
  MathJaxRenderer, 
  type PasswordEntry,
  type ValidationRules
} from "./password_manager";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { ToolPlugin } from "../manager";

describe("FormValidator", () => {
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

  test("should validate required fields", () => {
    const entry: Partial<PasswordEntry> = {
      name: "",
      username: "test",
    };
    
    const result = FormValidator.validateEntry(entry, DEFAULT_VALIDATION_RULES);
    
    expect(result.valid).toBe(false);
    expect(result.errors.name).toContain("name is required");
  });

  test("should validate minimum length", () => {
    const entry: Partial<PasswordEntry> = {
      name: "ab",  // Too short
      username: "testuser",
      password: "strongpass123!",
    };
    
    // Custom rules requiring 3 chars minimum for name
    const rules: ValidationRules = {
      minLength: { name: 3 },
    };
    
    const result = FormValidator.validateEntry(entry, rules);
    
    expect(result.valid).toBe(false);
    expect(result.errors.name).toContain("name must be at least 3 characters");
  });

  test("should validate password strength", () => {
    const weak = FormValidator.validatePasswordStrength("12345");
    expect(weak.strength).toBe("weak");
    expect(weak.feedback.length).toBeGreaterThan(0);
    
    const strong = FormValidator.validatePasswordStrength("MyS3cur3P@ssw0rd!!");
    expect(strong.strength).toBe("excellent");
  });

  test("should validate URL pattern", () => {
    const entry: Partial<PasswordEntry> = {
      name: "Test",
      username: "user",
      password: "SecurePass123!",
      url: "invalid-url",
    };
    
    const rules: ValidationRules = {
      required: ["name", "username", "password"],
      pattern: {
        url: /^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.*$/,
      },
    };
    
    const result = FormValidator.validateEntry(entry, rules);
    // URL validation should catch invalid URL format
    expect(result.errors.url || []).toContain("url format is invalid");
    expect(result.errors.url || []).toContain("url format is invalid");
  });

  test("should pass validation for valid entry", () => {
    const entry: Partial<PasswordEntry> = {
      name: "Gmail",
      username: "user@example.com",
      password: "SecurePass123!",
    };
    
    const result = FormValidator.validateEntry(entry, DEFAULT_VALIDATION_RULES);
    
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  test("should apply custom validators", () => {
    const rules: ValidationRules = {
      custom: {
        password: (value: string) => {
          if (value === "forbidden") return "This password is not allowed";
          return null;
        },
      },
    };
    
    const entry: Partial<PasswordEntry> = {
      name: "Test",
      username: "user",
      password: "forbidden",
    };
    
    const result = FormValidator.validateEntry(entry, rules);
    
    expect(result.valid).toBe(false);
    expect(result.errors.password).toContain("This password is not allowed");
  });
});

describe("MathJaxRenderer", () => {
  test("should render entropy formula", () => {
    const password = "Ab1!";
    const poolSize = 26 + 26 + 10 + 32; // 94 chars
    
    const formula = MathJaxRenderer.renderEntropyFormula(password, poolSize);
    
    expect(formula).toContain("Shannon Entropy");
    expect(formula).toContain("S =");
    expect(formula).toContain("L");
    expect(formula).toContain("log_2");
    expect(formula).toMatch(new RegExp("[0-9]+\.[0-9]+"));// ~26.40 bits
  });

  test("should render brute force formula", () => {
    const password = "abc";
    
    const formula = MathJaxRenderer.renderBruteForceFormula(password);
    
    expect(formula).toContain("Brute Force Time");
    expect(formula).toContain("N^L");
    expect(formula).toContain("T =");
  });

  test("should classify weak passwords correctly", () => {
    const weak = "1234";
    const formula = MathJaxRenderer.renderEntropyFormula(weak, 10);
    
    expect(formula).toContain("Weak");
    expect(formula).toContain("40");
  });

  test("should classify strong passwords correctly", () => {
    const strong = "SecurePassword123!";  // 18 chars, mixed
    const poolSize = 94;
    const formula = MathJaxRenderer.renderEntropyFormula(strong, poolSize);
    
    expect(formula).toContain("bits");
    expect(formula).toMatch(/\d+\.\d+/);
  });

  test("should include security assessment", () => {
    const weakPassword = "123";
    const formula = MathJaxRenderer.renderBruteForceFormula(weakPassword, 1e9);
    
    expect(formula).toContain("Assessment");
    expect(formula).toContain("CRITICAL");
  });
});

describe("Password Manager Plugin Integration", () => {
  test("plugin can be imported", async () => {
    const { passwordManagerPlugin } = await import("./password_manager");
    expect(passwordManagerPlugin).toBeDefined();
    expect(passwordManagerPlugin.definition.function.name).toBe("password_manager");
    expect(typeof passwordManagerPlugin.execute).toBe("function");
  });

  test("should add entry via plugin", async () => {
    const { passwordManagerPlugin } = await import("./password_manager");
    
    const result = await passwordManagerPlugin.execute({
      action: "add",
      entry: {
        name: "Test Entry",
        username: "testuser",
        password: "SecurePass123!",
        strength: "strong",
        tags: ["test"],
      },
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.entry).toBeDefined();
    expect(parsed.entry.name).toBe("Test Entry");
    expect(parsed.formulas).toBeDefined();
    expect(parsed.formulas).toContain("Entropy");

    // Cleanup
    await passwordManagerPlugin.execute({
      action: "delete",
      id: parsed.entry.id,
    });
  });

  test("should reject weak passwords via plugin", async () => {
    const { passwordManagerPlugin } = await import("./password_manager");
    
    const result = await passwordManagerPlugin.execute({
      action: "add",
      entry: {
        name: "Weak Entry",
        username: "user",
        password: "123",  // Too weak
        strength: "weak",
      },
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.validation?.valid).toBe(false);
    expect(parsed.formulas).toBeDefined();
  });

  test("should list entries via plugin", async () => {
    const { passwordManagerPlugin } = await import("./password_manager");
    
    // Add test entry
    const addResult = await passwordManagerPlugin.execute({
      action: "add",
      entry: {
        name: "List Test Entry",
        username: "listuser",
        password: "ListPass123!",
        strength: "strong",
      },
    });
    const added = JSON.parse(addResult);

    // List
    const listResult = await passwordManagerPlugin.execute({
      action: "list",
    });
    const listed = JSON.parse(listResult);
    
    expect(listed.success).toBe(true);
    expect(listed.entries.length).toBeGreaterThan(0);
    expect(listed.count).toBeGreaterThan(0);

    // Cleanup
    await passwordManagerPlugin.execute({
      action: "delete",
      id: added.entry.id,
    });
  });

  test("should search entries via plugin", async () => {
    const { passwordManagerPlugin } = await import("./password_manager");
    
    // Add unique entry
    const addResult = await passwordManagerPlugin.execute({
      action: "add",
      entry: {
        name: "SearchableUniqueNameXYZ",
        username: "searchuser",
        password: "SearchPass123!",
        strength: "strong",
      },
    });
    const added = JSON.parse(addResult);

    // Search
    const searchResult = await passwordManagerPlugin.execute({
      action: "search",
      query: "SearchableUniqueNameXYZ",
    });
    const searched = JSON.parse(searchResult);
    
    expect(searched.success).toBe(true);
    expect(searched.entries.length).toBeGreaterThan(0);

    // Cleanup
    await passwordManagerPlugin.execute({
      action: "delete",
      id: added.entry.id,
    });
  });

  test("should generate password formulas via plugin", async () => {
    const { passwordManagerPlugin } = await import("./password_manager");
    
    const result = await passwordManagerPlugin.execute({
      action: "generate_formula",
      password_to_analyze: "MyTest123!",
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.formulas).toContain("Entropy");
    expect(parsed.formulas).toContain("Brute Force");
    expect(parsed.password_length).toBe(10);
    expect(parsed.character_pool).toBe(94);
  });

  test("should get vault stats via plugin", async () => {
    const { passwordManagerPlugin } = await import("./password_manager");
    
    const result = await passwordManagerPlugin.execute({
      action: "stats",
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.stats.total).toBeDefined();
    expect(parsed.stats.byStrength).toBeDefined();
  });
});
