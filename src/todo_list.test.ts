import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TodoList, type Todo } from './todo_list';
import * as fs from 'fs';
import * as path from 'path';

const TEST_FILE = path.join(process.cwd(), 'test_todos.json');

describe('TodoList', () => {
  let todos: TodoList;

  beforeEach(() => {
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
    todos = new TodoList(TEST_FILE);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
  });

  describe('add', () => {
    it('should add a basic todo', () => {
      const todo = todos.add('Buy milk');
      
      expect(todo.id).toBe(1);
      expect(todo.text).toBe('Buy milk');
      expect(todo.status).toBe('pending');
      expect(todo.priority).toBe('medium');
      expect(todo.tags).toEqual([]);
      expect(todo.notes).toEqual([]);
      expect(todo.createdAt).toBeDefined();
    });

    it('should add todo with high priority', () => {
      const todo = todos.add('Urgent task', { priority: 'high' });
      expect(todo.priority).toBe('high');
    });

    it('should add todo with tags', () => {
      const todo = todos.add('Tagged task', { tags: ['work', 'urgent'] });
      expect(todo.tags).toEqual(['work', 'urgent']);
    });

    it('should auto-increment IDs', () => {
      const t1 = todos.add('First');
      const t2 = todos.add('Second');
      const t3 = todos.add('Third');
      
      expect(t1.id).toBe(1);
      expect(t2.id).toBe(2);
      expect(t3.id).toBe(3);
    });
  });

  describe('done/complete', () => {
    it('should mark todo as done', () => {
      todos.add('Task to complete');
      const completed = todos.done(1);
      
      expect(completed).not.toBeNull();
      expect(completed!.status).toBe('done');
      expect(completed!.completedAt).toBeDefined();
    });

    it('should return null for non-existent todo', () => {
      const result = todos.done(999);
      expect(result).toBeNull();
    });

    it('should work with complete() alias', () => {
      todos.add('Task');
      const completed = todos.complete(1);
      
      expect(completed!.status).toBe('done');
    });
  });

  describe('undo', () => {
    it('should undo a completed todo', () => {
      todos.add('Task');
      todos.done(1);
      const undone = todos.undo(1);
      
      expect(undone!.status).toBe('pending');
      expect(undone!.completedAt).toBeUndefined();
    });

    it('should return null for non-existent todo', () => {
      expect(todos.undo(999)).toBeNull();
    });
  });

  describe('archive', () => {
    it('should archive a todo', () => {
      todos.add('Task');
      const archived = todos.archive(1);
      
      expect(archived!.status).toBe('archived');
    });
  });

  describe('delete', () => {
    it('should delete a todo', () => {
      todos.add('Task to delete');
      const deleted = todos.delete(1);
      
      expect(deleted).toBe(true);
      expect(todos.get(1)).toBeUndefined();
    });

    it('should return false for non-existent todo', () => {
      expect(todos.delete(999)).toBe(false);
    });
  });

  describe('update', () => {
    it('should update todo text', () => {
      todos.add('Old text');
      const updated = todos.update(1, 'New text');
      
      expect(updated!.text).toBe('New text');
    });

    it('should return null for non-existent todo', () => {
      expect(todos.update(999, 'text')).toBeNull();
    });
  });

  describe('setPriority', () => {
    it('should change priority', () => {
      todos.add('Task');
      const updated = todos.setPriority(1, 'high');
      
      expect(updated!.priority).toBe('high');
    });
  });

  describe('tags', () => {
    it('should add a tag', () => {
      todos.add('Task');
      todos.addTag(1, 'work');
      
      expect(todos.get(1)?.tags).toContain('work');
    });

    it('should normalize tags to lowercase', () => {
      todos.add('Task');
      todos.addTag(1, 'WORK');
      
      expect(todos.get(1)?.tags).toContain('work');
    });

    it('should not duplicate tags', () => {
      todos.add('Task');
      todos.addTag(1, 'work');
      todos.addTag(1, 'work');
      
      expect(todos.get(1)?.tags).toEqual(['work']);
    });

    it('should remove a tag', () => {
      todos.add('Task', { tags: ['work', 'home'] });
      todos.removeTag(1, 'work');
      
      expect(todos.get(1)?.tags).toEqual(['home']);
    });
  });

  describe('notes', () => {
    it('should add a note with timestamp', () => {
      todos.add('Task');
      todos.addNote(1, 'Progress update');
      const todo = todos.get(1)!;
      
      expect(todo.notes.length).toBe(1);
      expect(todo.notes[0]).toContain('Progress update');
    });
  });

  describe('list', () => {
    beforeEach(() => {
      todos.add('First', { priority: 'low' });
      todos.add('Second', { priority: 'high' });
      todos.add('Third', { priority: 'medium' });
    });

    it('should list all todos sorted by ID', () => {
      const list = todos.list();
      expect(list.length).toBe(3);
      expect(list[0]!.id).toBe(1);
      expect(list[2]!.id).toBe(3);
    });

    it('should list pending sorted by priority', () => {
      const pending = todos.listPending();
      const highPrio = pending.find(t => t.priority === 'high');
      const mediumPrio = pending.find(t => t.priority === 'medium');
      const lowPrio = pending.find(t => t.priority === 'low');
      
      expect(highPrio?.text).toBe('Second');
      expect(mediumPrio?.text).toBe('Third');
      expect(lowPrio?.text).toBe('First');
    });

    it('should not include done todos in pending', () => {
      todos.done(2);
      const pending = todos.listPending();
      expect(pending.length).toBe(2);
      expect(pending.find(t => t.id === 2)).toBeUndefined();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      todos.add('Buy milk');
      todos.add('Call doctor');
    });

    it('should find todos by text', () => {
      const results = todos.search('milk');
      expect(results.length).toBe(1);
      expect(results[0]?.text).toBe('Buy milk');
    });

    it('should be case insensitive', () => {
      const results = todos.search('MILK');
      expect(results.length).toBe(1);
    });

    it('should return empty array for no matches', () => {
      const results = todos.search('xyz');
      expect(results.length).toBe(0);
    });
  });

  describe('getByTag', () => {
    beforeEach(() => {
      todos.add('Work task', { tags: ['work'] });
      todos.add('Personal task', { tags: ['personal'] });
    });

    it('should find todos by tag', () => {
      const results = todos.getByTag('work');
      expect(results.length).toBe(1);
      expect(results[0]?.text).toBe('Work task');
    });

    it('should be case insensitive', () => {
      const results = todos.getByTag('WORK');
      expect(results.length).toBe(1);
    });
  });

  describe('stats', () => {
    it('should return correct statistics', () => {
      todos.add('High priority', { priority: 'high' });
      todos.add('Medium priority', { priority: 'medium' });
      todos.add('Low priority', { priority: 'low' });
      todos.done(1);
      todos.archive(2);

      const stats = todos.stats();
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.archived).toBe(1);
      expect(stats.highPriority).toBe(0); // high priority is done
    });
  });

  describe('clearCompleted', () => {
    it('should remove completed todos', () => {
      todos.add('Task 1');
      todos.add('Task 2');
      todos.done(1);
      
      const removed = todos.clearCompleted();
      expect(removed).toBe(1);
      expect(todos.get(1)).toBeUndefined();
      expect(todos.get(2)).toBeDefined();
    });
  });

  describe('formatList', () => {
    it('should format todos as string', () => {
      todos.add('Buy milk', { tags: ['shopping'] });
      const formatted = todos.formatList();
      
      expect(formatted).toContain('1:');
      expect(formatted).toContain('Buy milk');
      expect(formatted).toContain('[shopping]');
    });

    it('should show message for empty list', () => {
      const formatted = todos.formatList();
      expect(formatted).toBe('📝 No todos found.');
    });

    it('should show done status', () => {
      todos.add('Task');
      todos.done(1);
      const formatted = todos.formatList(todos.list());
      
      expect(formatted).toContain('✅');
    });
  });

  describe('persistence', () => {
    it('should persist todos to disk', () => {
      todos.add('Persistent task');
      todos.done(1);

      // Create new instance pointing to same file
      const newTodos = new TodoList(TEST_FILE);
      const todo = newTodos.get(1);
      
      expect(todo).toBeDefined();
      expect(todo?.text).toBe('Persistent task');
      expect(todo?.status).toBe('done');
    });

    it('should maintain ID counter across instances', () => {
      todos.add('First');
      
      const newTodos = new TodoList(TEST_FILE);
      const todo = newTodos.add('Second');
      
      expect(todo.id).toBe(2);
    });
  });

  describe('count', () => {
    it('should return total count', () => {
      expect(todos.count()).toBe(0);
      todos.add('Task 1');
      expect(todos.count()).toBe(1);
      todos.add('Task 2');
      expect(todos.count()).toBe(2);
    });
  });
});
