import * as request from 'supertest';
import app from '../../../src/app';
import * as noteService from '../../../src/services/noteService';
import { NotFoundError, ValidationError } from '../../../src/errors';
import { Note } from '../../../src/models/note';

jest.mock('../../../src/services/noteService');

const mockUpdateNoteById = noteService.updateNoteById as jest.Mock;

describe('PATCH /notes/:id', () => {
  const noteId = 'note-unit-123';

  const seededNote: Note = {
    id: noteId,
    title: 'Original Title',
    body: 'Original body',
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // (a) 200 with updated note JSON on success
  // ---------------------------------------------------------------------------
  describe('(a) 200 with updated note JSON on success', () => {
    it('should return 200 with the updated note when title is patched', async () => {
      const updatedNote: Note = { ...seededNote, title: 'Updated Title' };
      mockUpdateNoteById.mockResolvedValueOnce(updatedNote);

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: noteId, title: 'Updated Title' });
    });

    it('should return 200 with the updated note when body is patched', async () => {
      const updatedNote: Note = { ...seededNote, body: 'Updated body content' };
      mockUpdateNoteById.mockResolvedValueOnce(updatedNote);

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ body: 'Updated body content' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: noteId, body: 'Updated body content' });
    });

    it('should return 200 with the updated note when both title and body are patched', async () => {
      const updatedNote: Note = { ...seededNote, title: 'New Title', body: 'New body' };
      mockUpdateNoteById.mockResolvedValueOnce(updatedNote);

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'New Title', body: 'New body' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: noteId, title: 'New Title', body: 'New body' });
    });

    it('should return the full note JSON including all fields', async () => {
      const updatedNote: Note = { ...seededNote, title: 'Updated Title' };
      mockUpdateNoteById.mockResolvedValueOnce(updatedNote);

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('body');
      expect(res.body).toHaveProperty('created_at');
      expect(res.body).toHaveProperty('updated_at');
    });

    it('should return Content-Type application/json on success', async () => {
      const updatedNote: Note = { ...seededNote, title: 'Updated Title' };
      mockUpdateNoteById.mockResolvedValueOnce(updatedNote);

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should call updateNoteById with the correct id and patch', async () => {
      const updatedNote: Note = { ...seededNote, title: 'Updated Title' };
      mockUpdateNoteById.mockResolvedValueOnce(updatedNote);

      await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(mockUpdateNoteById).toHaveBeenCalledWith(noteId, { title: 'Updated Title' });
    });

    it('should call updateNoteById exactly once per request', async () => {
      const updatedNote: Note = { ...seededNote, title: 'Updated Title' };
      mockUpdateNoteById.mockResolvedValueOnce(updatedNote);

      await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(mockUpdateNoteById).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // (b) 400 with { error, details } when body has no valid fields (middleware rejects)
  // ---------------------------------------------------------------------------
  describe('(b) 400 with { error, details } when body has no valid fields', () => {
    it('should return 400 when request body is empty', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return { error, details } structure when body has no valid fields', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({});

      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('details');
    });

    it('should return 400 when body contains only unrecognized fields', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ unknownField: 'value', anotherUnknown: 123 });

      expect(res.status).toBe(400);
    });

    it('should return Content-Type application/json on 400 validation rejection', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({});

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should NOT call updateNoteById when validation fails', async () => {
      await request(app)
        .patch(`/notes/${noteId}`)
        .send({});

      expect(mockUpdateNoteById).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // (c) 404 with { error: 'Note not found' } when service throws NotFoundError
  // ---------------------------------------------------------------------------
  describe('(c) 404 when service throws NotFoundError', () => {
    it('should return 404 when service throws NotFoundError', async () => {
      mockUpdateNoteById.mockRejectedValueOnce(new NotFoundError('Note not found'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
    });

    it('should return { error: "Note not found" } when service throws NotFoundError', async () => {
      mockUpdateNoteById.mockRejectedValueOnce(new NotFoundError('Note not found'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(res.body).toEqual({ error: 'Note not found' });
    });

    it('should return Content-Type application/json on 404 response', async () => {
      mockUpdateNoteById.mockRejectedValueOnce(new NotFoundError('Note not found'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return 404 for any non-existent note id', async () => {
      mockUpdateNoteById.mockRejectedValueOnce(new NotFoundError('Note not found'));

      const res = await request(app)
        .patch('/notes/does-not-exist')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // (d) 400 when title is empty string
  // ---------------------------------------------------------------------------
  describe('(d) 400 when title is empty string', () => {
    it('should return 400 when title is an empty string', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });

    it('should return Content-Type application/json when title is empty string', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: '' });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should NOT call updateNoteById when title is empty string', async () => {
      await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: '' });

      expect(mockUpdateNoteById).not.toHaveBeenCalled();
    });

    it('should return 200 when body is provided alongside empty-ish title guard', async () => {
      const updatedNote: Note = { ...seededNote, body: 'Valid body' };
      mockUpdateNoteById.mockResolvedValueOnce(updatedNote);

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ body: 'Valid body' });

      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // (e) 500 error propagated via error handler for unexpected throws
  // ---------------------------------------------------------------------------
  describe('(e) 500 error propagated via error handler for unexpected throws', () => {
    it('should return 500 when service throws an unexpected Error', async () => {
      mockUpdateNoteById.mockRejectedValueOnce(new Error('Unexpected database error'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(500);
    });

    it('should return Content-Type application/json on 500 response', async () => {
      mockUpdateNoteById.mockRejectedValueOnce(new Error('Unexpected database error'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return an error property in the body on 500 response', async () => {
      mockUpdateNoteById.mockRejectedValueOnce(new Error('Something went wrong'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });

    it('should not expose stack traces in the 500 response body', async () => {
      mockUpdateNoteById.mockRejectedValueOnce(new Error('Internal error'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Updated Title' });

      expect(res.body).not.toHaveProperty('stack');
    });
  });

  // ---------------------------------------------------------------------------
  // Content-Type: application/json on ALL responses (general assertion)
  // ---------------------------------------------------------------------------
  describe('Content-Type: application/json on all responses', () => {
    it('should return application/json for 200 success', async () => {
      mockUpdateNoteById.mockResolvedValueOnce({ ...seededNote });

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Test' });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return application/json for 400 validation error', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({});

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return application/json for 404 not found', async () => {
      mockUpdateNoteById.mockRejectedValueOnce(new NotFoundError('Note not found'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Test' });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return application/json for 500 unexpected error', async () => {
      mockUpdateNoteById.mockRejectedValueOnce(new Error('Boom'));

      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Test' });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
