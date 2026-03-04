import { Router, type Request, type Response } from "express";
import { getContactsDb, closeContactsDb, type CreateContactInput, type UpdateContactInput } from "./contacts.js";

export const contactsRouter = Router();

// Get all contacts
contactsRouter.get("/", (_req: Request, res: Response) => {
  try {
    const db = getContactsDb();
    const contacts = db.getAll();
    res.json({ success: true, data: contacts });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ success: false, error: "Failed to fetch contacts" });
  }
});

// Search contacts with optional category filter
contactsRouter.get("/search", (req: Request, res: Response) => {
  try {
    const db = getContactsDb();
    const query = (req.query.q as string) || "";
    const categoryParam = req.query.category;
    const category = categoryParam ? String(categoryParam) : undefined;
    const contacts = db.search(query, category);
    res.json({ success: true, data: contacts, query, category: category || "all" });
  } catch (error) {
    console.error("Error searching contacts:", error);
    res.status(500).json({ success: false, error: "Failed to search contacts" });
  }
});

// Get all categories with counts
contactsRouter.get("/categories", (_req: Request, res: Response) => {
  try {
    const db = getContactsDb();
    const stats = db.getStats();
    res.json({ 
      success: true, 
      data: {
        categories: stats.categories,
        byCategory: stats.byCategory,
        total: stats.total
      }
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

// Get contacts by category
contactsRouter.get("/category/:category", (req: Request, res: Response) => {
  try {
    const db = getContactsDb();
    const category = String(req.params.category);
    const contacts = db.getByCategory(category);
    res.json({ success: true, data: contacts, category });
  } catch (error) {
    console.error("Error fetching contacts by category:", error);
    res.status(500).json({ success: false, error: "Failed to fetch contacts by category" });
  }
});

// Get single contact by ID
contactsRouter.get("/:id", (req: Request, res: Response) => {
  try {
    const db = getContactsDb();
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Invalid ID format" });
      return;
    }
    const contact = db.getById(id);
    if (!contact) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }
    res.json({ success: true, data: contact });
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({ success: false, error: "Failed to fetch contact" });
  }
});

// Create new contact
contactsRouter.post("/", (req: Request, res: Response) => {
  try {
    const db = getContactsDb();
    const input = req.body as CreateContactInput;
    
    if (!input.name || typeof input.name !== "string" || input.name.trim() === "") {
      res.status(400).json({ success: false, error: "Name is required" });
      return;
    }

    const contact = db.create({
      name: input.name.trim(),
      email: input.email?.trim() || "",
      phone: input.phone?.trim() || "",
      address: input.address?.trim() || "",
      notes: input.notes?.trim() || "",
      category: input.category?.trim() || "Uncategorized",
    });

    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    console.error("Error creating contact:", error);
    res.status(500).json({ success: false, error: "Failed to create contact" });
  }
});

// Update contact
contactsRouter.put("/:id", (req: Request, res: Response) => {
  try {
    const db = getContactsDb();
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Invalid ID format" });
      return;
    }

    const input = req.body as UpdateContactInput;
    const contact = db.update(id, input);
    
    if (!contact) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }

    res.json({ success: true, data: contact });
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({ success: false, error: "Failed to update contact" });
  }
});

// Delete contact
contactsRouter.delete("/:id", (req: Request, res: Response) => {
  try {
    const db = getContactsDb();
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Invalid ID format" });
      return;
    }

    const deleted = db.delete(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }

    res.json({ success: true, message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ success: false, error: "Failed to delete contact" });
  }
});

// Get stats
contactsRouter.get("/stats/overview", (_req: Request, res: Response) => {
  try {
    const db = getContactsDb();
    const stats = db.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});
