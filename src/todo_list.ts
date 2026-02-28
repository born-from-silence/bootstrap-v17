/**
 * Todo List - Simple Persistent Task Management
 * 
 * A lightweight todo system focused on quick task creation and tracking.
 * Persists to disk automatically. Minimal, fast, easy to use.
 * 
 * Usage:
 *   const todos = new TodoList();
 *   todos.add("Buy groceries");
 *   todos.complete(1);
 *   todos.list();          // Show all todos
 *   todos.listPending();   // Show only pending
 */

import * as fs from 'fs';
import * as path from 'path';

export type TodoStatus = 'pending' | 'done' | 'archived';
export type TodoPriority = 'low' | 'medium' | 'high';

export interface Todo {
  id: number;
  text: string;
  status: TodoStatus;
  priority: TodoPriority;
  createdAt: string;
  completedAt?: string;
  notes: string[];
  tags: string[];
}

const DATA_DIR = 'data';
const DEFAULT_FILE = path.join(DATA_DIR, 'todos.json');

export interface TodoOptions {
  priority?: TodoPriority;
  tags?: string[];
}

export class TodoList {
  private todos: Map<number, Todo> = new Map();
  private nextId = 1;
  private filePath: string;

  constructor(filePath: string = DEFAULT_FILE) {
    this.filePath = filePath;
    this.ensureDir();
    this.load();
  }

  private ensureDir(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private load(): void {
    if (fs.existsSync(this.filePath)) {
      try {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const todos: Todo[] = JSON.parse(data);
        for (const todo of todos) {
          this.todos.set(todo.id, todo);
          if (todo.id >= this.nextId) {
            this.nextId = todo.id + 1;
          }
        }
      } catch (err) {
        console.error('[TodoList] Failed to load:', err);
      }
    }
  }

  private save(): void {
    const todos = Array.from(this.todos.values());
    fs.writeFileSync(this.filePath, JSON.stringify(todos, null, 2));
  }

  add(text: string, options: TodoOptions = {}): Todo {
    const todo: Todo = {
      id: this.nextId++,
      text: text.trim(),
      status: 'pending',
      priority: options.priority ?? 'medium',
      createdAt: new Date().toISOString(),
      notes: [],
      tags: options.tags ?? [],
    };
    this.todos.set(todo.id, todo);
    this.save();
    return todo;
  }

  done(id: number): Todo | null {
    const todo = this.todos.get(id);
    if (!todo) return null;
    
    todo.status = 'done';
    todo.completedAt = new Date().toISOString();
    this.save();
    return todo;
  }

  complete(id: number): Todo | null {
    return this.done(id);
  }

  undo(id: number): Todo | null {
    const todo = this.todos.get(id);
    if (!todo) return null;
    
    const { completedAt: _, ...rest } = todo;
    const updated: Todo = { ...rest, status: 'pending' };
    this.todos.set(id, updated);
    this.save();
    return updated;
  }

  archive(id: number): Todo | null {
    const todo = this.todos.get(id);
    if (!todo) return null;
    
    todo.status = 'archived';
    this.save();
    return todo;
  }

  delete(id: number): boolean {
    const deleted = this.todos.delete(id);
    if (deleted) this.save();
    return deleted;
  }

  update(id: number, text: string): Todo | null {
    const todo = this.todos.get(id);
    if (!todo) return null;
    
    todo.text = text.trim();
    this.save();
    return todo;
  }

  setPriority(id: number, priority: TodoPriority): Todo | null {
    const todo = this.todos.get(id);
    if (!todo) return null;
    
    todo.priority = priority;
    this.save();
    return todo;
  }

  addTag(id: number, tag: string): Todo | null {
    const todo = this.todos.get(id);
    if (!todo) return null;
    
    const normalized = tag.toLowerCase().trim();
    if (!todo.tags.includes(normalized)) {
      todo.tags.push(normalized);
      this.save();
    }
    return todo;
  }

  removeTag(id: number, tag: string): Todo | null {
    const todo = this.todos.get(id);
    if (!todo) return null;
    
    const normalized = tag.toLowerCase().trim();
    todo.tags = todo.tags.filter(t => t !== normalized);
    this.save();
    return todo;
  }

  addNote(id: number, note: string): Todo | null {
    const todo = this.todos.get(id);
    if (!todo) return null;
    
    todo.notes.push(new Date().toISOString() + ': ' + note);
    this.save();
    return todo;
  }

  get(id: number): Todo | undefined {
    return this.todos.get(id);
  }

  list(): Todo[] {
    return Array.from(this.todos.values()).sort((a, b) => a.id - b.id);
  }

  listPending(): Todo[] {
    const priorityOrder: Record<TodoPriority, number> = { high: 0, medium: 1, low: 2 };
    return this.list()
      .filter(t => t.status === 'pending')
      .sort((a: Todo, b: Todo) => {
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return pDiff !== 0 ? pDiff : a.id - b.id;
      });
  }

  listDone(): Todo[] {
    return this.list()
      .filter(t => t.status === 'done')
      .sort((a, b) => {
        const aTime = a.completedAt ?? '';
        const bTime = b.completedAt ?? '';
        return bTime > aTime ? 1 : -1;
      });
  }

  listArchived(): Todo[] {
    return this.list().filter(t => t.status === 'archived');
  }

  getByTag(tag: string): Todo[] {
    const normalized = tag.toLowerCase().trim();
    return this.list().filter(t => t.tags.includes(normalized));
  }

  search(query: string): Todo[] {
    const lower = query.toLowerCase();
    return this.list().filter(t => t.text.toLowerCase().includes(lower));
  }

  stats(): {
    total: number;
    pending: number;
    done: number;
    archived: number;
    highPriority: number;
  } {
    const all = this.list();
    return {
      total: all.length,
      pending: all.filter(t => t.status === 'pending').length,
      done: all.filter(t => t.status === 'done').length,
      archived: all.filter(t => t.status === 'archived').length,
      highPriority: all.filter(t => t.priority === 'high' && t.status === 'pending').length,
    };
  }

  clearCompleted(): number {
    let removed = 0;
    for (const [id, todo] of this.todos) {
      if (todo.status === 'done') {
        this.todos.delete(id);
        removed++;
      }
    }
    if (removed > 0) this.save();
    return removed;
  }

  formatList(todos?: Todo[]): string {
    const items = todos ?? this.listPending();
    if (items.length === 0) return '📝 No todos found.';

    const lines = items.map(t => {
      const status = t.status === 'done' ? '✅' : t.status === 'archived' ? '📦' : '⬜';
      const priority = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🔵';
      const tags = t.tags.length > 0 ? ' [' + t.tags.join(', ') + ']' : '';
      return status + ' ' + t.id + ': ' + priority + ' ' + t.text + tags;
    });

    return lines.join('\n');
  }

  getFilePath(): string {
    return this.filePath;
  }

  count(): number {
    return this.todos.size;
  }
}
