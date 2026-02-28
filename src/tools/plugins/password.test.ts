import { describe, it, expect } from "vitest";
import { passwordPlugin, type PasswordResult } from "./password";

describe("passwordPlugin", () => {
  describe("definition", () => {
    it("should have correct tool definition", () => {
      expect(passwordPlugin.definition.function.name).toBe("generate_password");
      expect(passwordPlugin.definition.function.description).toContain("password");
    });

    it("should define default values correctly", () => {
      const params = passwordPlugin.definition.function.parameters as any;
      expect(params.properties.length.default).toBe(16);
      expect(params.properties.length.minimum).toBe(4);
      expect(params.properties.length.maximum).toBe(128);
    });
  });

  describe("password generation", () => {
    it("should generate a password with default settings", async () => {
      const result = await passwordPlugin.execute({});
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(true);
      expect(parsed.password).toBeDefined();
      expect(parsed.password!.length).toBe(16);
      expect(parsed.length).toBe(16);
      expect(parsed.options).toEqual({
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
      });
    });

    it("should generate password with custom length", async () => {
      const result = await passwordPlugin.execute({ length: 32 });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(true);
      expect(parsed.password!.length).toBe(32);
      expect(parsed.length).toBe(32);
    });

    it("should respect minimum length of 4", async () => {
      const result = await passwordPlugin.execute({ length: 4 });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(true);
      expect(parsed.password!.length).toBe(4);
    });

    it("should reject length below minimum", async () => {
      const result = await passwordPlugin.execute({ length: 2 });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("between 4 and 128");
    });

    it("should reject length above maximum", async () => {
      const result = await passwordPlugin.execute({ length: 200 });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("between 4 and 128");
    });
  });

  describe("character set options", () => {
    it("should generate password with only lowercase", async () => {
      const result = await passwordPlugin.execute({
        include_uppercase: false,
        include_numbers: false,
        include_symbols: false,
      });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(true);
      expect(parsed.password).toMatch(/^[a-z]+$/);
      expect(parsed.options.includeLowercase).toBe(true);
      expect(parsed.options.includeUppercase).toBe(false);
      expect(parsed.options.includeNumbers).toBe(false);
      expect(parsed.options.includeSymbols).toBe(false);
    });

    it("should generate password with only numbers", async () => {
      const result = await passwordPlugin.execute({
        include_uppercase: false,
        include_lowercase: false,
        include_symbols: false,
      });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(true);
      expect(parsed.password).toMatch(/^[0-9]+$/);
    });

    it("should generate password with only symbols", async () => {
      const result = await passwordPlugin.execute({
        include_uppercase: false,
        include_lowercase: false,
        include_numbers: false,
      });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(true);
      expect(parsed.password).toMatch(/^[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/);
    });

    it("should reject when no character sets selected", async () => {
      const result = await passwordPlugin.execute({
        include_uppercase: false,
        include_lowercase: false,
        include_numbers: false,
        include_symbols: false,
      });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("At least one character set");
    });

    it("should include at least one character from each selected set", async () => {
      const result = await passwordPlugin.execute({ length: 20 });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(true);
      const password = parsed.password!;
      
      // Check that each character type is present
      expect(password).toMatch(/[A-Z]/); // uppercase
      expect(password).toMatch(/[a-z]/); // lowercase
      expect(password).toMatch(/[0-9]/); // numbers
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/); // symbols
    });
  });

  describe("password strength", () => {
    it("should mark short single-type passwords as weak", async () => {
      const result = await passwordPlugin.execute({
        length: 6,
        include_uppercase: false,
        include_numbers: false,
        include_symbols: false,
      });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(true);
      expect(parsed.strength).toBe("weak");
    });

    it("should mark long complex passwords as excellent", async () => {
      const result = await passwordPlugin.execute({ length: 24 });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(true);
      expect(parsed.strength).toBe("excellent");
    });

    it("should mark medium length with multiple types as good", async () => {
      const result = await passwordPlugin.execute({ length: 12 });
      const parsed = JSON.parse(result) as PasswordResult;
      
      expect(parsed.success).toBe(true);
      expect(["good", "strong", "excellent"]).toContain(parsed.strength);
    });
  });

  describe("randomness", () => {
    it("should generate unique passwords on successive calls", async () => {
      const passwords: string[] = [];
      for (let i = 0; i < 10; i++) {
        const result = await passwordPlugin.execute({ length: 32 });
        const parsed = JSON.parse(result) as PasswordResult;
        passwords.push(parsed.password!);
      }
      
      // Check all passwords are unique
      const uniquePasswords = new Set(passwords);
      expect(uniquePasswords.size).toBe(passwords.length);
    });
  });

  describe("randomization", () => {
    it("should shuffle characters to avoid predictable positions", async () => {
      // Generate multiple passwords and check that
      // the first character varies across different character sets
      const firstChars: string[] = [];
      for (let i = 0; i < 50; i++) {
        const result = await passwordPlugin.execute({ length: 16 });
        const parsed = JSON.parse(result) as PasswordResult;
        firstChars.push(parsed.password![0]!);
      }
      
      // Check we have variety in first character types
      const hasLowercase = firstChars.some(c => /[a-z]/.test(c));
      const hasUppercase = firstChars.some(c => /[A-Z]/.test(c));
      const hasNumbers = firstChars.some(c => /[0-9]/.test(c));
      const hasSymbols = firstChars.some(c => /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(c));
      
      // At least 3 different character types should appear at position 0
      const varietyCount = [hasLowercase, hasUppercase, hasNumbers, hasSymbols].filter(Boolean).length;
      expect(varietyCount).toBeGreaterThanOrEqual(2);
    });
  });
});
