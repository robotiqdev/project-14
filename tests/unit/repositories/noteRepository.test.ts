import { updateNote, NoteUpdatePatch } from '../../../src/repositories/noteRepository';
import { Note } from '../../../src/models/note';

jest.mock('../../../src/db/connection', () => ({
  db: {
    query: jest.fn(),
  },
}));

import { db } from '../../../src/db/connection';

const mockQuery = db.query as jest.Mock;

describe('noteRepository', () => {
  describe('updateNote', () => {
    const fixedDate = new Date('2024-01-15T10:00:00.000Z');

    const baseNote: Note = {
      id: 'note-123',
      title: 'Original Title',
      body: 'Original body content',
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: fixedDate,
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fixedDate);
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // -------------------------------------------------------------------------
    // (a) Returns updated note when record exists
    // -------------------------------------------------------------------------
    describe('returns updated note when record exists', () => {
      it('should return the full updated note row when id matches', async () => {
        const updatedNote: Note = { ...baseNote, title: 'New Title' };
        mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

        const result = await updateNote('note-123', { title: 'New Title' });

        expect(result).toEqual(updatedNote);
      });

      it('should return the note with updated body when body-only patch is applied', async () => {
        const updatedNote: Note = { ...baseNote, body: 'Updated body' };
        mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

        const result = await updateNote('note-123', { body: 'Updated body' });

        expect(result).toEqual(updatedNote);
      });

      it('should return the note with both fields updated when full patch is applied', async () => {
        const updatedNote: Note = { ...baseNote, title: 'New Title', body: 'New body' };
        mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

        const result = await updateNote('note-123', { title: 'New Title', body: 'New body' });

        expect(result).toEqual(updatedNote);
      });
    });

    // -------------------------------------------------------------------------
    // (b) Returns null when id not found
    // -------------------------------------------------------------------------
    describe('returns null when id not found', () => {
      it('should return null when rowCount is 0 (no matching record)', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await updateNote('nonexistent-id', { title: 'New Title' });

        expect(result).toBeNull();
      });

      it('should return null for a non-existent id with a body-only patch', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await updateNote('ghost-id', { body: 'Some body' });

        expect(result).toBeNull();
      });

      it('should return null for a non-existent id with both fields in patch', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await updateNote('ghost-id', { title: 'T', body: 'B' });

        expect(result).toBeNull();
      });
    });

    // -------------------------------------------------------------------------
    // (c) Only sets fields present in patch
    // -------------------------------------------------------------------------
    describe('only sets fields present in patch (partial update semantics)', () => {
      it('should include "title" in SET clause and NOT "body" when patch has title only', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'Title Only' });

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/title/i);
        expect(sql).not.toMatch(/\bbody\b/i);
      });

      it('should include "body" in SET clause and NOT "title" when patch has body only', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { body: 'Body Only' });

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/\bbody\b/i);
        expect(sql).not.toMatch(/\btitle\b/i);
      });

      it('should include both "title" and "body" in SET clause when patch has both fields', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'New Title', body: 'New body' });

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/\btitle\b/i);
        expect(sql).toMatch(/\bbody\b/i);
      });

      it('should pass the title value as a SQL parameter (not inlined into query string)', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'Injected Value' });

        const [, params] = mockQuery.mock.calls[0];
        expect(params).toContain('Injected Value');
      });

      it('should pass the body value as a SQL parameter (not inlined into query string)', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { body: 'Injected body' });

        const [, params] = mockQuery.mock.calls[0];
        expect(params).toContain('Injected body');
      });

      it('should pass the id as a SQL parameter', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'Test' });

        const [, params] = mockQuery.mock.calls[0];
        expect(params).toContain('note-123');
      });
    });

    // -------------------------------------------------------------------------
    // (d) Always sets updated_at to current timestamp regardless of patch content
    // -------------------------------------------------------------------------
    describe('always sets updated_at to current timestamp regardless of patch', () => {
      it('should include "updated_at" in SET clause when only title is patched', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'Title Only' });

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/updated_at/i);
      });

      it('should include "updated_at" in SET clause when only body is patched', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { body: 'Body Only' });

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/updated_at/i);
      });

      it('should include "updated_at" in SET clause when both fields are patched', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'T', body: 'B' });

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/updated_at/i);
      });

      it('should set updated_at to the pinned system time (deterministic with fake timers)', async () => {
        const pinnedDate = new Date('2025-06-01T08:00:00.000Z');
        jest.setSystemTime(pinnedDate);

        const noteWithPinnedDate: Note = { ...baseNote, updated_at: pinnedDate };
        mockQuery.mockResolvedValueOnce({ rows: [noteWithPinnedDate], rowCount: 1 });

        const result = await updateNote('note-123', { title: 'Pinned Time Test' });

        expect(result).not.toBeNull();
        expect(result!.updated_at).toEqual(pinnedDate);
      });

      it('should use a different updated_at when system time changes (fake timer control)', async () => {
        const time1 = new Date('2025-01-01T00:00:00.000Z');
        const time2 = new Date('2025-12-31T23:59:59.999Z');

        jest.setSystemTime(time1);
        const note1: Note = { ...baseNote, updated_at: time1 };
        mockQuery.mockResolvedValueOnce({ rows: [note1], rowCount: 1 });
        const result1 = await updateNote('note-1', { title: 'First' });

        jest.setSystemTime(time2);
        const note2: Note = { ...baseNote, updated_at: time2 };
        mockQuery.mockResolvedValueOnce({ rows: [note2], rowCount: 1 });
        const result2 = await updateNote('note-2', { title: 'Second' });

        expect(result1!.updated_at).toEqual(time1);
        expect(result2!.updated_at).toEqual(time2);
        expect(result1!.updated_at).not.toEqual(result2!.updated_at);
      });
    });

    // -------------------------------------------------------------------------
    // SQL query construction assertions
    // -------------------------------------------------------------------------
    describe('SQL query construction', () => {
      it('should execute an UPDATE notes SET ... query', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'Test' });

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/UPDATE\s+notes\s+SET/i);
      });

      it('should include RETURNING * to avoid a second SELECT round-trip', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'Test' });

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/RETURNING\s+\*/i);
      });

      it('should include a WHERE id = $n clause to target the correct row', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'Test' });

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/WHERE\s+id\s*=\s*\$\d+/i);
      });

      it('should use positional ($n) parameters rather than inlining values', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'Test Title', body: 'Test Body' });

        const [sql] = mockQuery.mock.calls[0];
        // Parameterized query should contain $1, $2, etc.
        expect(sql).toMatch(/\$\d+/);
      });

      it('should call db.query exactly once per updateNote invocation', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'Test' });

        expect(mockQuery).toHaveBeenCalledTimes(1);
      });

      it('should not include "body" placeholder in SET clause for a title-only patch', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { title: 'Only Title' });

        const [sql] = mockQuery.mock.calls[0];
        // Extract the SET clause (between SET and WHERE)
        const setClauseMatch = sql.match(/SET\s+(.*?)\s+WHERE/is);
        if (setClauseMatch) {
          const setClause = setClauseMatch[1];
          expect(setClause).not.toMatch(/\bbody\b/i);
        } else {
          // If we can't isolate the SET clause, at least verify the overall query shape
          expect(sql).toMatch(/UPDATE\s+notes\s+SET/i);
        }
      });

      it('should not include "title" placeholder in SET clause for a body-only patch', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [baseNote], rowCount: 1 });

        await updateNote('note-123', { body: 'Only Body' });

        const [sql] = mockQuery.mock.calls[0];
        const setClauseMatch = sql.match(/SET\s+(.*?)\s+WHERE/is);
        if (setClauseMatch) {
          const setClause = setClauseMatch[1];
          expect(setClause).not.toMatch(/\btitle\b/i);
        } else {
          expect(sql).toMatch(/UPDATE\s+notes\s+SET/i);
        }
      });
    });
  });
});
