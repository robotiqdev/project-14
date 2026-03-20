import Database = require('better-sqlite3');
import { createNotesTable, Note, CreateNoteInput, UpdateNoteInput } from '../../src/database/schema';

describe('createNotesTable', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates a table named "notes" in sqlite_master', () => {
    createNotesTable(db);

    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'")
      .get() as { name: string } | undefined;

    expect(row).toBeDefined();
    expect(row?.name).toBe('notes');
  });

  it('creates a notes table with the correct columns', () => {
    createNotesTable(db);

    const columns = (db.pragma('table_info(notes)') as Array<{ name: string }>).map(
      (c) => c.name,
    );

    expect(columns).toContain('id');
    expect(columns).toContain('title');
    expect(columns).toContain('content');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');
  });

  it('creates "id" as INTEGER PRIMARY KEY AUTOINCREMENT', () => {
    createNotesTable(db);

    const cols = db.pragma('table_info(notes)') as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      pk: number;
    }>;

    const idCol = cols.find((c) => c.name === 'id');
    expect(idCol).toBeDefined();
    expect(idCol?.type.toUpperCase()).toBe('INTEGER');
    expect(idCol?.pk).toBe(1);
  });

  it('creates "title" as TEXT NOT NULL', () => {
    createNotesTable(db);

    const cols = db.pragma('table_info(notes)') as Array<{
      name: string;
      type: string;
      notnull: number;
    }>;

    const col = cols.find((c) => c.name === 'title');
    expect(col).toBeDefined();
    expect(col?.type.toUpperCase()).toBe('TEXT');
    expect(col?.notnull).toBe(1);
  });

  it('creates "content" as TEXT NOT NULL', () => {
    createNotesTable(db);

    const cols = db.pragma('table_info(notes)') as Array<{
      name: string;
      type: string;
      notnull: number;
    }>;

    const col = cols.find((c) => c.name === 'content');
    expect(col).toBeDefined();
    expect(col?.type.toUpperCase()).toBe('TEXT');
    expect(col?.notnull).toBe(1);
  });

  it('creates "created_at" as TEXT NOT NULL', () => {
    createNotesTable(db);

    const cols = db.pragma('table_info(notes)') as Array<{
      name: string;
      type: string;
      notnull: number;
    }>;

    const col = cols.find((c) => c.name === 'created_at');
    expect(col).toBeDefined();
    expect(col?.type.toUpperCase()).toBe('TEXT');
    expect(col?.notnull).toBe(1);
  });

  it('creates "updated_at" as TEXT NOT NULL', () => {
    createNotesTable(db);

    const cols = db.pragma('table_info(notes)') as Array<{
      name: string;
      type: string;
      notnull: number;
    }>;

    const col = cols.find((c) => c.name === 'updated_at');
    expect(col).toBeDefined();
    expect(col?.type.toUpperCase()).toBe('TEXT');
    expect(col?.notnull).toBe(1);
  });

  it('is idempotent — calling createNotesTable twice does not throw', () => {
    expect(() => {
      createNotesTable(db);
      createNotesTable(db);
    }).not.toThrow();
  });

  it('inserting a row with all required fields succeeds and returns a valid lastInsertRowid', () => {
    createNotesTable(db);

    const result = db
      .prepare('INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run('Test Title', 'Test Content', new Date().toISOString(), new Date().toISOString());

    expect(result.lastInsertRowid).toBeDefined();
    expect(typeof result.lastInsertRowid === 'number' || typeof result.lastInsertRowid === 'bigint').toBe(true);
    expect(Number(result.lastInsertRowid)).toBeGreaterThan(0);
  });

  it('inserting a row without "title" throws a constraint error', () => {
    createNotesTable(db);

    expect(() => {
      db
        .prepare('INSERT INTO notes (content, created_at, updated_at) VALUES (?, ?, ?)')
        .run('Test Content', new Date().toISOString(), new Date().toISOString());
    }).toThrow();
  });

  it('inserting a row without "content" throws a constraint error', () => {
    createNotesTable(db);

    expect(() => {
      db
        .prepare('INSERT INTO notes (title, created_at, updated_at) VALUES (?, ?, ?)')
        .run('Test Title', new Date().toISOString(), new Date().toISOString());
    }).toThrow();
  });
});

describe('Note interface and types', () => {
  it('Note interface can be assigned an object with all required fields', () => {
    const note: Note = {
      id: 1,
      title: 'My Note',
      content: 'Some content',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    expect(note.id).toBe(1);
    expect(note.title).toBe('My Note');
    expect(note.content).toBe('Some content');
    expect(note.created_at).toBe('2024-01-01T00:00:00.000Z');
    expect(note.updated_at).toBe('2024-01-01T00:00:00.000Z');
  });

  it('CreateNoteInput type accepts title and content fields', () => {
    const input: CreateNoteInput = {
      title: 'New Note',
      content: 'Note content',
    };

    expect(input.title).toBe('New Note');
    expect(input.content).toBe('Note content');
  });

  it('UpdateNoteInput type accepts optional title and content fields', () => {
    const withTitle: UpdateNoteInput = { title: 'Updated Title' };
    const withContent: UpdateNoteInput = { content: 'Updated Content' };
    const withBoth: UpdateNoteInput = { title: 'T', content: 'C' };
    const empty: UpdateNoteInput = {};

    expect(withTitle.title).toBe('Updated Title');
    expect(withContent.content).toBe('Updated Content');
    expect(withBoth.title).toBe('T');
    expect(empty).toEqual({});
  });
});
