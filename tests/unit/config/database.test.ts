import { getDatabase, closeDatabase } from '../../../src/config/database';
import Database from 'better-sqlite3';

describe('Database Singleton (src/config/database.ts)', () => {
  beforeAll(() => {
    process.env.DATABASE_PATH = ':memory:';
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('getDatabase() – singleton behaviour', () => {
    it('returns a Database instance', () => {
      const db = getDatabase();
      expect(db).toBeDefined();
      expect(db).not.toBeNull();
    });

    it('returns the same instance on repeated calls (singleton)', () => {
      const first = getDatabase();
      const second = getDatabase();
      expect(first).toBe(second);
    });

    it('returns a third identical instance when called a third time', () => {
      const a = getDatabase();
      const b = getDatabase();
      const c = getDatabase();
      expect(a).toBe(b);
      expect(b).toBe(c);
    });
  });

  describe('closeDatabase() – singleton reset', () => {
    it('after closeDatabase() getDatabase() returns a NEW instance', () => {
      const first = getDatabase();
      closeDatabase();
      const second = getDatabase();
      expect(first).not.toBe(second);
    });

    it('calling closeDatabase() multiple times in a row does not throw', () => {
      getDatabase();
      expect(() => {
        closeDatabase();
        closeDatabase();
        closeDatabase();
      }).not.toThrow();
    });
  });

  describe('notes table – schema migration', () => {
    it('notes table exists after getDatabase() returns', () => {
      const db = getDatabase();
      const rows = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'")
        .all() as Array<{ name: string }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('notes');
    });

    it('notes table has the expected columns', () => {
      const db = getDatabase();
      const columns = db.prepare('PRAGMA table_info(notes)').all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: null | string;
        pk: number;
      }>;

      const colMap = Object.fromEntries(columns.map((c) => [c.name, c]));

      expect(colMap['id']).toBeDefined();
      expect(colMap['id'].pk).toBe(1);
      expect(colMap['id'].type.toUpperCase()).toBe('INTEGER');

      expect(colMap['title']).toBeDefined();
      expect(colMap['title'].type.toUpperCase()).toBe('TEXT');
      expect(colMap['title'].notnull).toBe(1);

      expect(colMap['body']).toBeDefined();
      expect(colMap['body'].type.toUpperCase()).toBe('TEXT');
      expect(colMap['body'].notnull).toBe(1);

      expect(colMap['created_at']).toBeDefined();
      expect(colMap['created_at'].type.toUpperCase()).toBe('INTEGER');
      expect(colMap['created_at'].notnull).toBe(1);

      expect(colMap['updated_at']).toBeDefined();
      expect(colMap['updated_at'].type.toUpperCase()).toBe('INTEGER');
      expect(colMap['updated_at'].notnull).toBe(1);
    });

    it('notes table enforces NOT NULL on title', () => {
      const db = getDatabase();
      expect(() => {
        db.prepare('INSERT INTO notes (title, body, created_at, updated_at) VALUES (NULL, ?, ?, ?)').run(
          'body text',
          Date.now(),
          Date.now(),
        );
      }).toThrow();
    });

    it('notes table enforces NOT NULL on body', () => {
      const db = getDatabase();
      expect(() => {
        db.prepare('INSERT INTO notes (title, body, created_at, updated_at) VALUES (?, NULL, ?, ?)').run(
          'A title',
          Date.now(),
          Date.now(),
        );
      }).toThrow();
    });

    it('notes table enforces NOT NULL on created_at', () => {
      const db = getDatabase();
      expect(() => {
        db.prepare('INSERT INTO notes (title, body, created_at, updated_at) VALUES (?, ?, NULL, ?)').run(
          'A title',
          'body text',
          Date.now(),
        );
      }).toThrow();
    });

    it('notes table enforces NOT NULL on updated_at', () => {
      const db = getDatabase();
      expect(() => {
        db.prepare('INSERT INTO notes (title, body, created_at, updated_at) VALUES (?, ?, ?, NULL)').run(
          'A title',
          'body text',
          Date.now(),
        );
      }).toThrow();
    });

    it('accepts a valid note row', () => {
      const db = getDatabase();
      const now = Date.now();
      const result = db
        .prepare('INSERT INTO notes (title, body, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run('Hello', 'World', now, now);
      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeGreaterThan(0);
    });

    it('auto-increments the id column', () => {
      const db = getDatabase();
      const now = Date.now();
      const insert = db.prepare('INSERT INTO notes (title, body, created_at, updated_at) VALUES (?, ?, ?, ?)');
      const r1 = insert.run('First', 'Body one', now, now);
      const r2 = insert.run('Second', 'Body two', now, now);
      expect(Number(r2.lastInsertRowid)).toBeGreaterThan(Number(r1.lastInsertRowid));
    });
  });

  describe('database pragmas', () => {
    it('WAL journal mode is enabled', () => {
      const db = getDatabase();
      const row = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
      expect(row.journal_mode).toBe('wal');
    });

    it('foreign_keys pragma is ON', () => {
      const db = getDatabase();
      const row = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
      expect(row.foreign_keys).toBe(1);
    });
  });
});
