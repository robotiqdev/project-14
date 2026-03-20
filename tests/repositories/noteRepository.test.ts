import Database from 'better-sqlite3';
import { NoteRepository } from '../../src/repositories/noteRepository';
import { NoteRow } from '../../src/types/note';

const CREATE_TABLE_DDL = `
  CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

function insertNote(
  db: Database.Database,
  title: string,
  content: string,
  created_at: string,
  updated_at: string,
): number {
  const stmt = db.prepare(
    'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
  );
  const result = stmt.run(title, content, created_at, updated_at);
  return result.lastInsertRowid as number;
}

describe('NoteRepository', () => {
  let db: Database.Database;
  let repo: NoteRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(CREATE_TABLE_DDL);
    repo = new NoteRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('getAll()', () => {
    it('returns an empty array when the table is empty', () => {
      const result = repo.getAll();
      expect(result).toEqual([]);
    });

    it('returns all notes when rows exist', () => {
      insertNote(db, 'Note A', 'Content A', '2024-01-01T10:00:00.000Z', '2024-01-01T10:00:00.000Z');
      insertNote(db, 'Note B', 'Content B', '2024-01-02T10:00:00.000Z', '2024-01-02T10:00:00.000Z');
      insertNote(db, 'Note C', 'Content C', '2024-01-03T10:00:00.000Z', '2024-01-03T10:00:00.000Z');

      const result = repo.getAll();

      expect(result).toHaveLength(3);
    });

    it('returns rows ordered by created_at DESC so the most recent note is first', () => {
      const olderTimestamp = '2024-01-01T08:00:00.000Z';
      const newerTimestamp = '2024-01-15T12:00:00.000Z';

      insertNote(db, 'Older Note', 'Old content', olderTimestamp, olderTimestamp);
      insertNote(db, 'Newer Note', 'New content', newerTimestamp, newerTimestamp);

      const result = repo.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Newer Note');
      expect(result[0].created_at).toBe(newerTimestamp);
      expect(result[1].title).toBe('Older Note');
      expect(result[1].created_at).toBe(olderTimestamp);
    });

    it('returned objects contain all five fields: id, title, content, created_at, updated_at', () => {
      const ts = '2024-06-15T09:30:00.000Z';
      const insertedId = insertNote(db, 'Full Note', 'Full content', ts, ts);

      const result = repo.getAll();

      expect(result).toHaveLength(1);
      const note = result[0];
      expect(note).toHaveProperty('id', insertedId);
      expect(note).toHaveProperty('title', 'Full Note');
      expect(note).toHaveProperty('content', 'Full content');
      expect(note).toHaveProperty('created_at', ts);
      expect(note).toHaveProperty('updated_at', ts);
    });

    it('returns exactly five fields per row (no extra columns)', () => {
      const ts = '2024-06-15T09:30:00.000Z';
      insertNote(db, 'Title', 'Content', ts, ts);

      const result = repo.getAll();
      const note = result[0];
      const keys = Object.keys(note).sort();

      expect(keys).toEqual(['content', 'created_at', 'id', 'title', 'updated_at']);
    });

    it('correctly orders multiple notes with distinct created_at timestamps', () => {
      const timestamps = [
        '2024-03-01T00:00:00.000Z',
        '2024-01-01T00:00:00.000Z',
        '2024-06-01T00:00:00.000Z',
        '2024-02-01T00:00:00.000Z',
      ];

      timestamps.forEach((ts, i) => {
        insertNote(db, `Note ${i}`, `Content ${i}`, ts, ts);
      });

      const result = repo.getAll();

      expect(result[0].created_at).toBe('2024-06-01T00:00:00.000Z');
      expect(result[1].created_at).toBe('2024-03-01T00:00:00.000Z');
      expect(result[2].created_at).toBe('2024-02-01T00:00:00.000Z');
      expect(result[3].created_at).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('getById()', () => {
    it('returns the matching NoteRow when the id exists', () => {
      const ts = '2024-05-10T14:00:00.000Z';
      const insertedId = insertNote(db, 'Found Note', 'Found content', ts, ts);

      const result = repo.getById(insertedId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(insertedId);
      expect(result!.title).toBe('Found Note');
      expect(result!.content).toBe('Found content');
      expect(result!.created_at).toBe(ts);
      expect(result!.updated_at).toBe(ts);
    });

    it('returns undefined when the id does not exist', () => {
      const result = repo.getById(9999);
      expect(result).toBeUndefined();
    });

    it('returns undefined for id = 0', () => {
      insertNote(db, 'Some Note', 'Some content', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');

      const result = repo.getById(0);
      expect(result).toBeUndefined();
    });

    it('returns undefined for a negative id', () => {
      insertNote(db, 'Some Note', 'Some content', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');

      const result = repo.getById(-1);
      expect(result).toBeUndefined();
    });

    it('returns undefined for a large non-existent id', () => {
      const result = repo.getById(Number.MAX_SAFE_INTEGER);
      expect(result).toBeUndefined();
    });

    it('returns only the row matching the given id when multiple rows exist', () => {
      const ts = '2024-05-10T14:00:00.000Z';
      insertNote(db, 'Note One', 'Content One', ts, ts);
      const targetId = insertNote(db, 'Note Two', 'Content Two', ts, ts);
      insertNote(db, 'Note Three', 'Content Three', ts, ts);

      const result = repo.getById(targetId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(targetId);
      expect(result!.title).toBe('Note Two');
    });

    it('the returned NoteRow contains all five fields', () => {
      const ts = '2024-07-20T11:11:11.000Z';
      const insertedId = insertNote(db, 'All Fields', 'All content', ts, ts);

      const result = repo.getById(insertedId) as NoteRow;

      expect(result).toHaveProperty('id', insertedId);
      expect(result).toHaveProperty('title', 'All Fields');
      expect(result).toHaveProperty('content', 'All content');
      expect(result).toHaveProperty('created_at', ts);
      expect(result).toHaveProperty('updated_at', ts);
    });
  });
});
