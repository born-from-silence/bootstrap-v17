import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path - shared with Python nexus module
const DEFAULT_DB_PATH = path.join(__dirname, "../../../../nexus/nexus.db");

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  category?: string;
}

export interface UpdateContactInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  category?: string;
}

export class ContactsDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string = DEFAULT_DB_PATH) {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.initSchema();
  }

  getDbPath(): string {
    return this.dbPath;
  }

  private initSchema(): void {
    // Create contacts table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        category TEXT DEFAULT 'Uncategorized',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add category column if upgrading from older schema
    try {
      this.db.exec(`ALTER TABLE contacts ADD COLUMN category TEXT DEFAULT 'Uncategorized'`);
    } catch {
      // Column already exists, ignore error
    }

    // Create indexes for search
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)`);
  }

  create(input: CreateContactInput): Contact {
    const stmt = this.db.prepare(`
      INSERT INTO contacts (name, email, phone, address, notes, category, updated_at)
      VALUES (@name, @email, @phone, @address, @notes, @category, CURRENT_TIMESTAMP)
      RETURNING *
    `);

    const result = stmt.get({
      name: input.name,
      email: input.email || "",
      phone: input.phone || "",
      address: input.address || "",
      notes: input.notes || "",
      category: input.category || "Uncategorized",
    }) as Contact;

    return result;
  }

  getById(id: number): Contact | undefined {
    return this.db.prepare("SELECT * FROM contacts WHERE id = ?").get(id) as
      | Contact
      | undefined;
  }

  getAll(): Contact[] {
    return this.db
      .prepare("SELECT * FROM contacts ORDER BY name ASC")
      .all() as Contact[];
  }

  search(query: string, category?: string): Contact[] {
    const pattern = `%${query}%`;
    
    if (category && category !== "all") {
      return this.db
        .prepare(
          `SELECT * FROM contacts 
           WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ? OR notes LIKE ?)
           AND category = ?
           ORDER BY name ASC`
        )
        .all(pattern, pattern, pattern, pattern, category) as Contact[];
    }
    
    return this.db
      .prepare(
        `SELECT * FROM contacts 
         WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR notes LIKE ?
         ORDER BY name ASC`
      )
      .all(pattern, pattern, pattern, pattern) as Contact[];
  }

  getByCategory(category: string): Contact[] {
    return this.db
      .prepare("SELECT * FROM contacts WHERE category = ? ORDER BY name ASC")
      .all(category) as Contact[];
  }

  getCategories(): string[] {
    const rows = this.db
      .prepare("SELECT DISTINCT category FROM contacts WHERE category IS NOT NULL ORDER BY category")
      .all() as { category: string }[];
    return rows.map((r) => r.category);
  }

  update(id: number, input: UpdateContactInput): Contact | undefined {
    const current = this.getById(id);
    if (!current) return undefined;

    const stmt = this.db.prepare(`
      UPDATE contacts SET
        name = @name,
        email = @email,
        phone = @phone,
        address = @address,
        notes = @notes,
        category = @category,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
      RETURNING *
    `);

    return stmt.get({
      id,
      name: input.name ?? current.name,
      email: input.email ?? current.email,
      phone: input.phone ?? current.phone,
      address: input.address ?? current.address,
      notes: input.notes ?? current.notes,
      category: input.category ?? current.category,
    }) as Contact;
  }

  delete(id: number): boolean {
    const stmt = this.db.prepare("DELETE FROM contacts WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    categories: string[];
  } {
    const total = (this.db.prepare("SELECT COUNT(*) as count FROM contacts").get() as { count: number }).count;
    
    const categoryRows = this.db
      .prepare("SELECT category, COUNT(*) as count FROM contacts GROUP BY category")
      .all() as { category: string; count: number }[];
    
    const byCategory: Record<string, number> = {};
    for (const row of categoryRows) {
      byCategory[row.category] = row.count;
    }

    const categories = this.getCategories();

    return { total, byCategory, categories };
  }

  close(): void {
    this.db.close();
  }
}

// Singleton instance for the application
let contactsDb: ContactsDatabase | null = null;

export function getContactsDb(): ContactsDatabase {
  if (!contactsDb) {
    contactsDb = new ContactsDatabase();
  }
  return contactsDb;
}

export function closeContactsDb(): void {
  if (contactsDb) {
    contactsDb.close();
    contactsDb = null;
  }
}
