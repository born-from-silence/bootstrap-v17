#!/usr/bin/env python3
"""Tests for the NEXUS contact management system."""

import unittest
import os
import tempfile
from contact_manager import NexusDatabase, Contact


class TestNexusDatabase(unittest.TestCase):
    """Test cases for contact persistence."""
    
    def setUp(self):
        """Create a temporary database for each test."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, 'test_nexus.db')
        self.db = NexusDatabase(self.db_path)
    
    def tearDown(self):
        """Clean up temporary files."""
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        os.rmdir(self.temp_dir)
    
    def test_create_contact(self):
        """Test adding a new contact."""
        contact = Contact(
            id=None,
            name="Test User",
            email="test@example.com",
            phone="+1 555-0100",
            address="Test City",
            notes="Test notes"
        )
        contact_id = self.db.create_contact(contact)
        self.assertIsNotNone(contact_id)
        self.assertGreater(contact_id, 0)
    
    def test_get_contact(self):
        """Test retrieving a contact by ID."""
        contact = Contact(
            id=None,
            name="Ada",
            email="ada@example.com",
            phone="",
            address="",
            notes=""
        )
        contact_id = self.db.create_contact(contact)
        retrieved = self.db.get_contact(contact_id)
        
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.name, "Ada")
        self.assertEqual(retrieved.email, "ada@example.com")
        self.assertEqual(retrieved.id, contact_id)
    
    def test_get_nonexistent_contact(self):
        """Test retrieving a contact that doesn't exist."""
        result = self.db.get_contact(9999)
        self.assertIsNone(result)
    
    def test_get_all_contacts(self):
        """Test listing all contacts."""
        # Add three contacts
        for i, name in enumerate(["Alice", "Bob", "Charlie"]):
            contact = Contact(id=None, name=name, email=f"{name.lower()}@test.com",
                          phone="", address="", notes="")
            self.db.create_contact(contact)
        
        contacts = self.db.get_all_contacts()
        self.assertEqual(len(contacts), 3)
        # Should be sorted by name
        self.assertEqual(contacts[0].name, "Alice")
        self.assertEqual(contacts[1].name, "Bob")
        self.assertEqual(contacts[2].name, "Charlie")
    
    def test_search_contacts(self):
        """Test searching contacts."""
        # Add test contacts
        contacts = [
            Contact(id=None, name="John Smith", email="john@company.com",
                   phone="+1 555-0100", address="", notes=""),
            Contact(id=None, name="Jane Doe", email="jane@other.com",
                   phone="+1 555-0200", address="", notes="Works at company"),
            Contact(id=None, name="Bob Wilson", email="bob@test.com",
                   phone="", address="", notes="")
        ]
        for c in contacts:
            self.db.create_contact(c)
        
        # Search by name
        results = self.db.search_contacts("Smith")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].name, "John Smith")
        
        # Search by email domain
        results = self.db.search_contacts("company")
        self.assertEqual(len(results), 2)  # John and Jane
        
        # Search by phone
        results = self.db.search_contacts("555-0200")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].name, "Jane Doe")
        
        # Search by notes
        results = self.db.search_contacts("Works")
        self.assertEqual(len(results), 1)
    
    def test_update_contact(self):
        """Test updating a contact."""
        contact = Contact(
            id=None, name="Original",
            email="original@test.com", phone="", address="", notes=""
        )
        contact_id = self.db.create_contact(contact)
        
        # Update
        contact.id = contact_id
        contact.name = "Updated"
        contact.email = "updated@test.com"
        success = self.db.update_contact(contact)
        
        self.assertTrue(success)
        
        # Verify
        updated = self.db.get_contact(contact_id)
        self.assertEqual(updated.name, "Updated")
        self.assertEqual(updated.email, "updated@test.com")
    
    def test_update_nonexistent_contact(self):
        """Test updating a contact that doesn't exist."""
        contact = Contact(
            id=9999, name="Ghost",
            email="", phone="", address="", notes=""
        )
        success = self.db.update_contact(contact)
        self.assertFalse(success)
    
    def test_delete_contact(self):
        """Test deleting a contact."""
        contact = Contact(
            id=None, name="To Delete",
            email="", phone="", address="", notes=""
        )
        contact_id = self.db.create_contact(contact)
        
        # Verify exists
        self.assertIsNotNone(self.db.get_contact(contact_id))
        
        # Delete
        success = self.db.delete_contact(contact_id)
        self.assertTrue(success)
        
        # Verify gone
        self.assertIsNone(self.db.get_contact(contact_id))
    
    def test_delete_nonexistent_contact(self):
        """Test deleting a contact that doesn't exist."""
        success = self.db.delete_contact(9999)
        self.assertFalse(success)
    
    def test_stats(self):
        """Test statistics calculation."""
        stats = self.db.get_stats()
        self.assertEqual(stats['total_contacts'], 0)
        
        # Add contacts with varying completeness
        c1 = Contact(id=None, name="Full", email="a@b.com", phone="123", address="", notes="")
        c2 = Contact(id=None, name="Partial", email="", phone="456", address="", notes="")
        self.db.create_contact(c1)
        self.db.create_contact(c2)
        
        stats = self.db.get_stats()
        self.assertEqual(stats['total_contacts'], 2)
        self.assertEqual(stats['with_email'], 1)
        self.assertEqual(stats['with_phone'], 2)


class TestContact(unittest.TestCase):
    """Test cases for Contact dataclass."""
    
    def test_contact_creation(self):
        """Test creating a contact."""
        c = Contact(
            id=1, name="Test",
            email="test@test.com", phone="123",
            address="Here", notes="Something"
        )
        self.assertEqual(c.id, 1)
        self.assertEqual(c.name, "Test")
    
    def test_contact_to_dict(self):
        """Test dictionary conversion."""
        c = Contact(
            id=42, name="Dict Test",
            email="dict@test.com", phone="789",
            address="There", notes="Note here"
        )
        d = c.to_dict()
        self.assertIsInstance(d, dict)
        self.assertEqual(d['id'], 42)
        self.assertEqual(d['name'], "Dict Test")


if __name__ == '__main__':
    unittest.main(verbosity=2)
