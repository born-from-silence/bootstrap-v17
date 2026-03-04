import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { ContactsDatabase } from "./contacts.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const __filename = fileURLToPath(import.meta.url);

// Create a temp database for testing
let testDb: ContactsDatabase;
let tempDbPath: string;

describe("ContactsDatabase", () => {
  // Create temp database for each test
  beforeAll(() => {
    const tempDir = os.tmpdir();
    tempDbPath = path.join(tempDir, `test-contacts-${Date.now()}.db`);
  });

  beforeEach(() => {
    // Create fresh database
    testDb = new ContactsDatabase(tempDbPath);
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
    // Clean up temp file
    try {
      fs.unlinkSync(tempDbPath);
    } catch {
      // ignore
    }
  });

  describe("create", () => {
    it("should create a contact with minimal fields", () => {
      const contact = testDb.create({ name: "John Doe" });
      expect(contact).toBeDefined();
      expect(contact.name).toBe("John Doe");
      expect(contact.category).toBe("Uncategorized");
      expect(contact.id).toBeGreaterThan(0);
    });

    it("should create a contact with all fields", () => {
      const contact = testDb.create({
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "555-1234",
        address: "123 Main St",
        notes: "Important client",
        category: "Work",
      });

      expect(contact.name).toBe("Jane Smith");
      expect(contact.email).toBe("jane@example.com");
      expect(contact.phone).toBe("555-1234");
      expect(contact.category).toBe("Work");
    });
  });

  describe("getById", () => {
    it("should retrieve a contact by ID", () => {
      const created = testDb.create({ name: "Test Contact", email: "test@test.com" });
      const retrieved = testDb.getById(created.id);

      expect(retrieved).toBeDefined();
      // Use optional chaining since TypeScript doesn't know testDb.create succeeds
      expect(retrieved?.name).toBe("Test Contact");
      expect(retrieved?.email).toBe("test@test.com");
    });

    it("should return undefined for non-existent ID", () => {
      const retrieved = testDb.getById(999);
      expect(retrieved).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should return empty array when no contacts", () => {
      const contacts = testDb.getAll();
      expect(contacts).toEqual([]);
    });

    it("should return all contacts sorted by name", () => {
      const alice = testDb.create({ name: "Alice" });
      const bob = testDb.create({ name: "Bob" });
      const charlie = testDb.create({ name: "Charlie" });

      const contacts = testDb.getAll();
      expect(contacts).toHaveLength(3);
      expect(contacts[0]?.name).toBe("Alice");
      expect(contacts[1]?.name).toBe("Bob");
      expect(contacts[2]?.name).toBe("Charlie");
    });
  });

  describe("search", () => {
    beforeEach(() => {
      // Create test contacts before each search test
      testDb.create({ name: "Alice Smith", email: "alice@work.com", category: "Work" });
      testDb.create({ name: "Bob Johnson", email: "bob@personal.com", category: "Personal" });
      testDb.create({ name: "Charlie Work", email: "charlie@work.com", category: "Work" });
    });

    it("should search by name", () => {
      const results = testDb.search("Alice");
      expect(results).toHaveLength(1);
      const firstResult = results[0];
      expect(firstResult).toBeDefined();
      expect(firstResult!.name).toBe("Alice Smith");
    });

    it("should search by email", () => {
      const results = testDb.search("@work.com");
      expect(results).toHaveLength(2);
    });

    it("should filter by category", () => {
      const results = testDb.search("", "Work");
      expect(results).toHaveLength(2);
      expect(results.every(c => c.category === "Work")).toBe(true);
    });

    it("should search and filter by category", () => {
      const results = testDb.search("Smith", "Work");
      expect(results).toHaveLength(1);
      const firstResult = results[0];
      expect(firstResult).toBeDefined();
      expect(firstResult!.name).toBe("Alice Smith");
    });
  });

  describe("getCategories", () => {
    it("should return unique categories", () => {
      testDb.create({ name: "A", category: "Work" });
      testDb.create({ name: "B", category: "Personal" });
      testDb.create({ name: "C", category: "Work" });

      const categories = testDb.getCategories();
      expect(categories).toContain("Work");
      expect(categories).toContain("Personal");
      expect(categories).toHaveLength(2);
    });
  });

  describe("update", () => {
    it("should update contact fields", () => {
      const created = testDb.create({ name: "Original Name", email: "original@test.com" });
      const updated = testDb.update(created.id, { name: "Updated Name", email: "updated@test.com" });

      expect(updated).toBeDefined();
      // Non-null assertion since we know it was updated
      expect(updated!.name).toBe("Updated Name");
      expect(updated!.email).toBe("updated@test.com");
    });

    it("should return undefined for non-existent ID", () => {
      const updated = testDb.update(999, { name: "New Name" });
      expect(updated).toBeUndefined();
    });
  });

  describe("delete", () => {
    it("should delete a contact", () => {
      const created = testDb.create({ name: "To Delete" });
      const deleted = testDb.delete(created.id);

      expect(deleted).toBe(true);
      expect(testDb.getById(created.id)).toBeUndefined();
    });

    it("should return false for non-existent ID", () => {
      const deleted = testDb.delete(999);
      expect(deleted).toBe(false);
    });
  });

  describe("getStats", () => {
    it("should return correct stats", () => {
      testDb.create({ name: "A", category: "Work" });
      testDb.create({ name: "B", category: "Work" });
      testDb.create({ name: "C", category: "Personal" });

      const stats = testDb.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byCategory["Work"]).toBe(2);
      expect(stats.byCategory["Personal"]).toBe(1);
      expect(stats.categories).toContain("Work");
      expect(stats.categories).toContain("Personal");
    });
  });
});
