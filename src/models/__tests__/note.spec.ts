import { Note, CreateNoteInput, NoteRow, mapRowToNote } from '../note';

describe('Note domain model types', () => {
  describe('mapRowToNote', () => {
    it('maps all snake_case fields to camelCase correctly', () => {
      const row: NoteRow = {
        id: 1,
        title: 'Test Note',
        body: 'Some body content',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      };

      const note: Note = mapRowToNote(row);

      expect(note.id).toBe(1);
      expect(note.title).toBe('Test Note');
      expect(note.body).toBe('Some body content');
      expect(note.createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(note.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    });

    it('returns a Note with no snake_case keys', () => {
      const row: NoteRow = {
        id: 42,
        title: 'Another Note',
        body: 'Body text',
        created_at: '2026-03-01T10:00:00.000Z',
        updated_at: '2026-03-10T12:00:00.000Z',
      };

      const note = mapRowToNote(row);

      expect(note).not.toHaveProperty('created_at');
      expect(note).not.toHaveProperty('updated_at');
    });

    it('returns an object with exactly the Note domain model keys', () => {
      const row: NoteRow = {
        id: 7,
        title: 'Key Check',
        body: 'Verifying keys',
        created_at: '2026-02-01T00:00:00.000Z',
        updated_at: '2026-02-02T00:00:00.000Z',
      };

      const note = mapRowToNote(row);

      const keys = Object.keys(note).sort();
      expect(keys).toEqual(['body', 'createdAt', 'id', 'title', 'updatedAt']);
    });

    it('preserves id as a number', () => {
      const row: NoteRow = {
        id: 99,
        title: 'ID Check',
        body: 'body',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };

      const note = mapRowToNote(row);

      expect(typeof note.id).toBe('number');
      expect(note.id).toBe(99);
    });

    it('preserves empty string values for title and body', () => {
      const row: NoteRow = {
        id: 10,
        title: '',
        body: '',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };

      const note = mapRowToNote(row);

      expect(note.title).toBe('');
      expect(note.body).toBe('');
    });

    it('preserves timestamp strings exactly without conversion', () => {
      const createdAt = '2025-12-31T23:59:59.999Z';
      const updatedAt = '2026-01-01T00:00:00.001Z';

      const row: NoteRow = {
        id: 5,
        title: 'Timestamp Note',
        body: 'body',
        created_at: createdAt,
        updated_at: updatedAt,
      };

      const note = mapRowToNote(row);

      expect(note.createdAt).toBe(createdAt);
      expect(note.updatedAt).toBe(updatedAt);
    });
  });

  describe('TypeScript interface contracts (compile-time)', () => {
    it('Note interface has all required camelCase fields', () => {
      // This is a compile-time check — if Note is missing fields, tsc will fail
      const note: Note = {
        id: 1,
        title: 'Note Title',
        body: 'Note Body',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };

      expect(note.id).toBe(1);
      expect(note.title).toBe('Note Title');
      expect(note.body).toBe('Note Body');
      expect(note.createdAt).toBeDefined();
      expect(note.updatedAt).toBeDefined();
    });

    it('CreateNoteInput interface has only title and body', () => {
      const input: CreateNoteInput = {
        title: 'New Note',
        body: 'New note body',
      };

      expect(input.title).toBe('New Note');
      expect(input.body).toBe('New note body');
    });

    it('NoteRow interface has snake_case DB column fields', () => {
      const row: NoteRow = {
        id: 3,
        title: 'Row Note',
        body: 'Row body',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      };

      expect(row.id).toBe(3);
      expect(row.created_at).toBeDefined();
      expect(row.updated_at).toBeDefined();
    });
  });
});
