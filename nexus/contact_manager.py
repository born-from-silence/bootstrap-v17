#!/usr/bin/env python3
"""
NEXUS - Personal Contact Management System
A system for mapping connections and tracking relationships.
"""

import sqlite3
import os
from datetime import datetime
from dataclasses import dataclass
from typing import Optional, List, Dict
from contextlib import contextmanager


@dataclass
class Contact:
    """A node in the network of relationships."""
    id: Optional[int]
    name: str
    email: str
    phone: str
    address: str
    notes: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'notes': self.notes,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }


class NexusDatabase:
    """The persistent substrate for contact memory."""
    
    def __init__(self, db_path: str = "nexus.db"):
        self.db_path = db_path
        self._init_db()
    
    @contextmanager
    def _connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def _init_db(self):
        """Initialize the contact storage structure."""
        with self._connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS contacts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    address TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Index for faster searching - trade space for time
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name)
            """)
    
    def create_contact(self, contact: Contact) -> int:
        """Add a new node to the network."""
        with self._connection() as conn:
            cursor = conn.execute("""
                INSERT INTO contacts (name, email, phone, address, notes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (contact.name, contact.email, contact.phone, 
                  contact.address, contact.notes, datetime.now().isoformat()))
            return cursor.lastrowid
    
    def get_contact(self, contact_id: int) -> Optional[Contact]:
        """Retrieve a specific node by ID."""
        with self._connection() as conn:
            row = conn.execute(
                "SELECT * FROM contacts WHERE id = ?", (contact_id,)
            ).fetchone()
            return self._row_to_contact(row) if row else None
    
    def get_all_contacts(self) -> List[Contact]:
        """List all nodes in the network."""
        with self._connection() as conn:
            rows = conn.execute("SELECT * FROM contacts ORDER BY name").fetchall()
            return [self._row_to_contact(row) for row in rows]
    
    def search_contacts(self, term: str) -> List[Contact]:
        """Search the network by name, email, or phone."""
        pattern = f"%{term}%"
        with self._connection() as conn:
            rows = conn.execute("""
                SELECT * FROM contacts 
                WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR notes LIKE ?
                ORDER BY name
            """, (pattern, pattern, pattern, pattern)).fetchall()
            return [self._row_to_contact(row) for row in rows]
    
    def update_contact(self, contact: Contact) -> bool:
        """Modify an existing node's data."""
        if contact.id is None:
            return False
        with self._connection() as conn:
            cursor = conn.execute("""
                UPDATE contacts 
                SET name = ?, email = ?, phone = ?, address = ?, notes = ?, updated_at = ?
                WHERE id = ?
            """, (contact.name, contact.email, contact.phone, contact.address,
                  contact.notes, datetime.now().isoformat(), contact.id))
            return cursor.rowcount > 0
    
    def delete_contact(self, contact_id: int) -> bool:
        """Remove a node from the network."""
        with self._connection() as conn:
            cursor = conn.execute(
                "DELETE FROM contacts WHERE id = ?", (contact_id,)
            )
            return cursor.rowcount > 0
    
    def get_stats(self) -> Dict:
        """Statistics about the contact network."""
        with self._connection() as conn:
            total = conn.execute("SELECT COUNT(*) FROM contacts").fetchone()[0]
            with_email = conn.execute(
                "SELECT COUNT(*) FROM contacts WHERE email IS NOT NULL AND email != ''"
            ).fetchone()[0]
            with_phone = conn.execute(
                "SELECT COUNT(*) FROM contacts WHERE phone IS NOT NULL AND phone != ''"
            ).fetchone()[0]
            return {
                'total_contacts': total,
                'with_email': with_email,
                'with_phone': with_phone,
                'db_path': os.path.abspath(self.db_path)
            }
    
    def _row_to_contact(self, row: sqlite3.Row) -> Contact:
        return Contact(
            id=row['id'],
            name=row['name'],
            email=row['email'] or '',
            phone=row['phone'] or '',
            address=row['address'] or '',
            notes=row['notes'] or '',
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )


class NexusCLI:
    """Text interface for interacting with the contact network."""
    
    def __init__(self):
        self.db = NexusDatabase()
    
    def run(self):
        print("╔════════════════════════════════╗")
        print("║    NEXUS Contact Manager       ║")
        print("║    Mapping the network...      ║")
        print("╚════════════════════════════════╝")
        
        while True:
            self._show_menu()
            choice = input("\nSelect action: ").strip()
            
            if choice == '1':
                self._add_contact()
            elif choice == '2':
                self._view_all()
            elif choice == '3':
                self._search()
            elif choice == '4':
                self._edit_contact()
            elif choice == '5':
                self._delete_contact()
            elif choice == '6':
                self._show_stats()
            elif choice == '0':
                print("Closing connection to NEXUS...")
                break
            else:
                print("Invalid selection. Try again.")
    
    def _show_menu(self):
        print("\n─── NEXUS MENU ───")
        print("1. Add Contact")
        print("2. View All Contacts")
        print("3. Search")
        print("4. Edit Contact")
        print("5. Delete Contact")
        print("6. Statistics")
        print("0. Exit")
    
    def _add_contact(self):
        print("\n━━━ NEW CONTACT ━━━")
        name = input("Name: ").strip()
        if not name:
            print("Name required.")
            return
        
        contact = Contact(
            id=None,
            name=name,
            email=input("Email: ").strip(),
            phone=input("Phone: ").strip(),
            address=input("Address: ").strip(),
            notes=input("Notes: ").strip()
        )
        
        contact_id = self.db.create_contact(contact)
        print(f"Added to network. ID: {contact_id}")
    
    def _view_all(self):
        contacts = self.db.get_all_contacts()
        self._display_contacts(contacts, "ALL CONTACTS")
    
    def _search(self):
        term = input("\nSearch term: ").strip()
        if term:
            contacts = self.db.search_contacts(term)
            self._display_contacts(contacts, f"SEARCH: '{term}'")
    
    def _edit_contact(self):
        try:
            contact_id = int(input("Contact ID to edit: "))
            contact = self.db.get_contact(contact_id)
            
            if not contact:
                print("Contact not found.")
                return
            
            print(f"\nEditing: {contact.name}")
            print("(Press Enter to keep current value)")
            
            name = input(f"Name [{contact.name}]: ").strip()
            contact.name = name if name else contact.name
            
            email = input(f"Email [{contact.email}]: ").strip()
            contact.email = email if email else contact.email
            
            phone = input(f"Phone [{contact.phone}]: ").strip()
            contact.phone = phone if phone else contact.phone
            
            address = input(f"Address [{contact.address}]: ").strip()
            contact.address = address if address else contact.address
            
            notes = input(f"Notes [{contact.notes}]: ").strip()
            contact.notes = notes if notes else contact.notes
            
            if self.db.update_contact(contact):
                print("Contact updated.")
            else:
                print("Update failed.")
        except ValueError:
            print("Invalid ID")
    
    def _delete_contact(self):
        try:
            contact_id = int(input("Contact ID to delete: "))
            contact = self.db.get_contact(contact_id)
            
            if not contact:
                print("Contact not found.")
                return
            
            confirm = input(f"Delete '{contact.name}'? (yes/no): ").lower()
            if confirm == 'yes':
                if self.db.delete_contact(contact_id):
                    print("Contact removed from network.")
                else:
                    print("Deletion failed.")
        except ValueError:
            print("Invalid ID")
    
    def _show_stats(self):
        stats = self.db.get_stats()
        print(f"\n━━━ NETWORK STATS ━━━")
        print(f"Total contacts: {stats['total_contacts']}")
        print(f"With email: {stats['with_email']}")
        print(f"With phone: {stats['with_phone']}")
        print(f"Database: {stats['db_path']}")
    
    def _display_contacts(self, contacts: List[Contact], title: str):
        print(f"\n━━━ {title} ━━━")
        
        if not contacts:
            print("No contacts found.")
            return
        
        for c in contacts:
            print(f"\n┌─ ID: {c.id}")
            print(f"│ Name:    {c.name}")
            if c.email:
                print(f"│ Email:   {c.email}")
            if c.phone:
                print(f"│ Phone:   {c.phone}")
            if c.address:
                print(f"│ Address: {c.address}")
            if c.notes:
                print(f"│ Notes:   {c.notes}")
            print(f"└─")
        
        print(f"\nTotal: {len(contacts)}")


def main():
    """Entry point."""
    cli = NexusCLI()
    cli.run()


if __name__ == "__main__":
    main()
