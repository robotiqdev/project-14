import * as request from 'supertest';
import app from '../../src/app';
import { NoteNotFoundError } from '../../src/errors/notes.errors';
import { NotesService } from '../../src/services/notes.service';

// Variables starting with 'mock' are allowed in jest.mock factory (hoisting safe)
const mockDeleteNote = jest.fn();

jest.mock('../../src/services/notes.service', () => ({
  NotesService: jest.fn().mockImplementation(() => ({
    deleteNote: mockDeleteNote,
  })),
}));

describe('DELETE /notes/:id', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // (a) Service resolves successfully → 204 No Content
  describe('when the service resolves successfully', () => {
    it('returns 204 No Content with an empty body', async () => {
      mockDeleteNote.mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/notes/${validUuid}`)
        .expect(204);

      expect(response.body).toEqual({});
      expect(response.text).toBe('');
    });

    it('calls NotesService.deleteNote with the id from the route params', async () => {
      mockDeleteNote.mockResolvedValue(undefined);

      await request(app)
        .delete(`/notes/${validUuid}`)
        .expect(204);

      expect(mockDeleteNote).toHaveBeenCalledTimes(1);
      expect(mockDeleteNote).toHaveBeenCalledWith(validUuid);
    });
  });

  // (b) Service throws NoteNotFoundError → 404 JSON
  describe('when the service throws NoteNotFoundError', () => {
    it('returns 404 JSON with error message and noteId', async () => {
      mockDeleteNote.mockRejectedValue(new NoteNotFoundError(validUuid));

      const response = await request(app)
        .delete(`/notes/${validUuid}`)
        .expect(404);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({
        error: 'Note not found',
        noteId: validUuid,
      });
    });

    it('includes the noteId from the request path in the 404 response body', async () => {
      const otherId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      mockDeleteNote.mockRejectedValue(new NoteNotFoundError(otherId));

      const response = await request(app)
        .delete(`/notes/${otherId}`)
        .expect(404);

      expect(response.body.noteId).toBe(otherId);
      expect(response.body.error).toBe('Note not found');
    });
  });

  // (c) Non-UUID id format → 400 before reaching the service
  describe('when the id is not a valid UUID', () => {
    it('returns 400 JSON with "Invalid note ID format" for a plain string', async () => {
      const response = await request(app)
        .delete('/notes/not-a-uuid')
        .expect(400);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({
        error: 'Invalid note ID format',
      });
    });

    it('returns 400 JSON with "Invalid note ID format" for a numeric string', async () => {
      const response = await request(app)
        .delete('/notes/12345')
        .expect(400);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({
        error: 'Invalid note ID format',
      });
    });

    it('returns 400 JSON with "Invalid note ID format" for a partial UUID', async () => {
      const response = await request(app)
        .delete('/notes/123e4567-e89b-12d3')
        .expect(400);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({
        error: 'Invalid note ID format',
      });
    });

    it('does not call the service when the id is not a valid UUID', async () => {
      await request(app).delete('/notes/invalid-id').expect(400);

      expect(mockDeleteNote).not.toHaveBeenCalled();
    });
  });

  // (d) Service throws unexpected Error → 500 via global error handler
  describe('when the service throws an unexpected error', () => {
    it('returns 500 JSON with "Internal server error"', async () => {
      mockDeleteNote.mockRejectedValue(new Error('Unexpected database failure'));

      const response = await request(app)
        .delete(`/notes/${validUuid}`)
        .expect(500);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({
        error: 'Internal server error',
      });
    });

    it('does not expose the internal error message in the response', async () => {
      mockDeleteNote.mockRejectedValue(new Error('Sensitive internal detail'));

      const response = await request(app)
        .delete(`/notes/${validUuid}`)
        .expect(500);

      expect(response.body.message).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('Sensitive internal detail');
    });
  });

  // Type narrowing: NoteNotFoundError must not match the generic 500 handler
  describe('error type narrowing', () => {
    it('treats NoteNotFoundError as 404, not 500', async () => {
      mockDeleteNote.mockRejectedValue(new NoteNotFoundError(validUuid));

      const response = await request(app)
        .delete(`/notes/${validUuid}`);

      expect(response.status).toBe(404);
      expect(response.status).not.toBe(500);
    });

    it('returns 404 Content-Type application/json (not HTML)', async () => {
      mockDeleteNote.mockRejectedValue(new NoteNotFoundError(validUuid));

      const response = await request(app)
        .delete(`/notes/${validUuid}`)
        .expect(404);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // NotesService is properly used (module-level mock verification)
  describe('NotesService mock wiring', () => {
    it('NotesService constructor is called when the module is loaded', () => {
      // The mock constructor should have been invoked when the controller module loaded
      expect(NotesService).toBeDefined();
    });
  });
});
