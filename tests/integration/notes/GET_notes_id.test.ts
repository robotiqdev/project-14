import { request } from '../../setup';
import { truncateNotes, seedNote, NoteRecord } from '../../helpers/db.helper';

// Import setup to ensure beforeAll/afterAll hooks are registered
import '../../setup';

// A syntactically valid UUID that will not be in the database
const VALID_UUID_NOT_IN_DB = '00000000-0000-0000-0000-000000000000';

// A string that is not a valid UUID
const MALFORMED_ID = 'not-a-valid-uuid';

describe('GET /api/v1/notes/:id', () => {
  beforeEach(async () => {
    await truncateNotes();
  });

  describe('when a note with the given ID exists', () => {
    it('returns 200 with the correct note data', async () => {
      const seededNote: NoteRecord = await seedNote({
        title: 'Specific Note',
        content: 'Specific content for retrieval',
      });

      const response = await request.get(`/api/v1/notes/${seededNote.id}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
    });

    it('returns the note with matching id', async () => {
      const seededNote: NoteRecord = await seedNote({
        title: 'Findable Note',
        content: 'Content to find',
      });

      const response = await request.get(`/api/v1/notes/${seededNote.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(seededNote.id);
    });

    it('returns the note with correct title and content', async () => {
      const seededNote: NoteRecord = await seedNote({
        title: 'My Exact Title',
        content: 'My exact content',
      });

      const response = await request.get(`/api/v1/notes/${seededNote.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('My Exact Title');
      expect(response.body.data.content).toBe('My exact content');
    });

    it('returns createdAt and updatedAt as ISO 8601 strings', async () => {
      const seededNote: NoteRecord = await seedNote({
        title: 'Date Fields Note',
        content: 'Content',
      });

      const response = await request.get(`/api/v1/notes/${seededNote.id}`);

      expect(response.status).toBe(200);
      const data = response.body.data;

      expect(data).toHaveProperty('createdAt');
      expect(data).toHaveProperty('updatedAt');
      expect(typeof data.createdAt).toBe('string');
      expect(typeof data.updatedAt).toBe('string');

      // Must be valid ISO strings that round-trip correctly
      expect(new Date(data.createdAt).toISOString()).toBe(data.createdAt);
      expect(new Date(data.updatedAt).toISOString()).toBe(data.updatedAt);
    });
  });

  describe('when a valid UUID is provided but no note is found', () => {
    it('returns 404 with status error and code NOTE_NOT_FOUND', async () => {
      const response = await request.get(`/api/v1/notes/${VALID_UUID_NOT_IN_DB}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        status: 'error',
        code: 'NOTE_NOT_FOUND',
      });
    });
  });

  describe('when a malformed (non-UUID) ID is provided', () => {
    it('returns 422 with status error and code INVALID_UUID', async () => {
      const response = await request.get(`/api/v1/notes/${MALFORMED_ID}`);

      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({
        status: 'error',
        code: 'INVALID_UUID',
      });
    });

    it('returns 422 for an empty-string-like segment', async () => {
      const response = await request.get('/api/v1/notes/12345');

      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({
        status: 'error',
        code: 'INVALID_UUID',
      });
    });

    it('returns 422 for a partial UUID', async () => {
      const response = await request.get('/api/v1/notes/00000000-0000-0000-0000');

      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({
        status: 'error',
        code: 'INVALID_UUID',
      });
    });
  });
});
