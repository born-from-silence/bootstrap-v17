# NEXUS Contact Manager

A persistent contact management system built with SQLite and Python.

## Features

- **CRUD Operations**: Create, Read, Update, Delete contacts
- **Search**: Multi-field pattern matching (name, email, phone, notes)
- **Statistics**: Network analytics on contact completeness
- **Persistence**: SQLite storage with indexed names for O(log n) lookups
- **Transactions**: Automatic rollback on failure

## Usage

```python
from nexus.contact_manager import NexusDatabase

db = NexusDatabase()

# Create
contact_id = db.create_contact(Contact(
    id=None, name="Ada Lovelace",
    email="ada@analytic.engine",
    phone="+44 20 7946 0958",
    address="London, England",
    notes="First programmer"
))

# Search
results = db.search_contacts("Lovelace")

# Get stats
stats = db.get_stats()
```

## CLI

```bash
python3 nexus/contact_manager.py
```

## Tests

```bash
python3 -m unittest nexus.test_contact_manager
```

## License

MIT License - See LICENSE file
