/**
 * Integration test: PATCH /notes/:id
 *
 * Tests the full vertical slice: HTTP request → routing → middleware →
 * controller → service → repository → db, with only the db.query
 * call mocked to simulate an in-memory SQLite/test DB.
 *
 * This validates that all layers wire together correctly, request
 * routing is properly configured, and the full pipeline produces
 * the expected HTTP responses and DB interactions.
 */
import * as request from 'supertest';
import app from '../../../src/app';
import { db } from '../../../src/db/connection';
import { Note } from '../../../src/models/note';

jest.mock('../../../src/db/connection', () => ({
  db: {
    query: jest.fn(),
  },
}));

const mockQuery = db.query as jest.Mock;

describe('Integration: PATCH /notes/:id', () => {
  const noteId = 'integ-note-abc';

  const seededNote: Note = {
    id: noteId,
    title: 'Seeded Title',
    body: 'Seeded body content',
    created_at: new Date('2024-03-01T09:00:00.000Z'),
    updated_at: new Date('2024-03-01T09:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Full vertical slice: successful update
  // ---------------------------------------------------------------------------
  describe('successful PATCH — full vertical slice', () => {
    it('should return 200 and updated note when title is patched', async () => {
      const updatedNote: Note = { ...seededNote, title: 'Patched Title' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Patched Title' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body.id).toBe(noteId);
      expect(res.body.title).toBe('Patched Title');
    });

    it('should return 200 and updated note when body is patched', async () => {
      const updatedNote: Note = { ...seededNote, body: 'Updated integration body' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ body: 'Updated integration body' });

      expect(res.status).toBe(200);
      expect(res.body.body).toBe('Updated integration body');
    });

    it('should return 200 when both title and body are patched', async () => {
      const updatedNote: Note = { ...seededNote, title: 'New Title', body: 'New body' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'New Title', body: 'New body' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
      expect(res.body.body).toBe('New body');
    });

    it('should return Content-Type application/json on successful patch', async () => {
      const updatedNote: Note = { ...seededNote, title: 'Title' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Title' });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ---------------------------------------------------------------------------
  // DB state verification: the correct SQL + params reach the DB layer
  // ---------------------------------------------------------------------------
  describe('DB state verification', () => {
    it('should invoke db.query exactly once per PATCH request', async () => {
      const updatedNote: Note = { ...seededNote, title: 'Test' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

      await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Test' });

      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should pass the title patch value down to db.query as a parameter', async () => {
      const updatedNote: Note = { ...seededNote, title: 'DB Verified Title' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

      await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'DB Verified Title' });

      const [, params] = mockQuery.mock.calls[0];
      expect(params).toContain('DB Verified Title');
    });

    it('should pass the note id down to db.query as a parameter', async () => {
      const updatedNote: Note = { ...seededNote };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

      await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Test' });

      const [, params] = mockQuery.mock.calls[0];
      expect(params).toContain(noteId);
    });

    it('should issue an UPDATE SQL statement targeting the notes table', async () => {
      const updatedNote: Note = { ...seededNote };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

      await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Test' });

      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toMatch(/UPDATE\s+notes/i);
    });

    it('should pass the body patch value down to db.query as a parameter', async () => {
      const updatedNote: Note = { ...seededNote, body: 'Integration body value' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

      await request(app)
        .patch(`/notes/${noteId}`)
        .send({ body: 'Integration body value' });

      const [, params] = mockQuery.mock.calls[0];
      expect(params).toContain('Integration body value');
    });
  });

  // ---------------------------------------------------------------------------
  // 404 when note does not exist in the DB
  // ---------------------------------------------------------------------------
  describe('note not found (DB returns empty rows)', () => {
    it('should return 404 when the DB returns no rows for the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .patch('/notes/nonexistent-note-id')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
    });

    it('should return { error: "Note not found" } when note does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .patch('/notes/nonexistent-note-id')
        .send({ title: 'Updated Title' });

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/not found/i);
    });

    it('should return Content-Type application/json on 404 response', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .patch('/notes/nonexistent-note-id')
        .send({ title: 'Updated Title' });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ---------------------------------------------------------------------------
  // 400 validation: no valid fields in the request body
  // ---------------------------------------------------------------------------
  describe('validation: no valid fields in body', () => {
    it('should return 400 when request body is empty', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return { error, details } when body has no valid fields', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({});

      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('details');
    });

    it('should return Content-Type application/json on 400 validation error', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({});

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should NOT reach the DB layer when validation fails', async () => {
      await request(app)
        .patch(`/notes/${noteId}`)
        .send({});

      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return 400 when title is an empty string', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // 500: unexpected DB errors propagate as 500
  // ---------------------------------------------------------------------------
  describe('unexpected DB error handling', () => {
    it('should return 500 when db.query throws an unexpected error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Test' });

      expect(res.status).toBe(500);
    });

    it('should return Content-Type application/json on 500 response', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Test' });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include an error property in the 500 response body', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Unexpected DB failure'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Test' });

      expect(res.body).toHaveProperty('error');
    });
  });

  // ---------------------------------------------------------------------------
  // Response shape assertions
  // ---------------------------------------------------------------------------
  describe('response shape and content', () => {
    it('should return the full note object in the response body on success', async () => {
      const updatedNote: Note = {
        id: noteId,
        title: 'Shape Test',
        body: 'Body content',
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        updated_at: new Date('2024-03-15T12:00:00.000Z'),
      };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Shape Test' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', noteId);
      expect(res.body).toHaveProperty('title', 'Shape Test');
      expect(res.body).toHaveProperty('body', 'Body content');
      expect(res.body).toHaveProperty('created_at');
      expect(res.body).toHaveProperty('updated_at');
    });

    it('should reflect the updated_at timestamp returned from DB', async () => {
      const updatedAt = new Date('2024-06-01T15:30:00.000Z');
      const updatedNote: Note = { ...seededNote, updated_at: updatedAt };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNote], rowCount: 1 });

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(200);
      expect(new Date(res.body.updated_at).toISOString()).toBe(updatedAt.toISOString());
    });
  });
});
