import { request } from '../../setup';
import { truncateNotes, seedNote } from '../../helpers/db.helper';

// Import setup to ensure beforeAll/afterAll hooks are registered
import '../../setup';

describe('GET /api/v1/notes', () => {
  beforeEach(async () => {
    await truncateNotes();
  });

  describe('when the database is empty', () => {
    it('returns 200 with empty data array and count of 0', async () => {
      const response = await request.get('/api/v1/notes');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'success',
        data: [],
        count: 0,
      });
    });
  });

  describe('when notes exist', () => {
    it('returns 200 with count matching number of seeded notes', async () => {
      const older = new Date('2024-01-01T10:00:00.000Z');
      const middle = new Date('2024-01-02T10:00:00.000Z');
      const newer = new Date('2024-01-03T10:00:00.000Z');

      await seedNote({ title: 'Oldest Note', content: 'Oldest content', created_at: older, updated_at: older });
      await seedNote({ title: 'Middle Note', content: 'Middle content', created_at: middle, updated_at: middle });
      await seedNote({ title: 'Newest Note', content: 'Newest content', created_at: newer, updated_at: newer });

      const response = await request.get('/api/v1/notes');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.count).toBe(3);
      expect(response.body.data).toHaveLength(3);
    });

    it('returns notes ordered newest-first (descending by createdAt)', async () => {
      const older = new Date('2024-01-01T10:00:00.000Z');
      const middle = new Date('2024-01-02T10:00:00.000Z');
      const newer = new Date('2024-01-03T10:00:00.000Z');

      await seedNote({ title: 'Oldest Note', content: 'Oldest content', created_at: older, updated_at: older });
      await seedNote({ title: 'Middle Note', content: 'Middle content', created_at: middle, updated_at: middle });
      await seedNote({ title: 'Newest Note', content: 'Newest content', created_at: newer, updated_at: newer });

      const response = await request.get('/api/v1/notes');

      expect(response.status).toBe(200);

      const data = response.body.data;
      expect(new Date(data[0].createdAt).getTime()).toBeGreaterThan(
        new Date(data[1].createdAt).getTime(),
      );
      expect(new Date(data[1].createdAt).getTime()).toBeGreaterThan(
        new Date(data[2].createdAt).getTime(),
      );
    });

    it('returns each note with id, title, content, createdAt, updatedAt fields', async () => {
      await seedNote({ title: 'My Note', content: 'My note content' });

      const response = await request.get('/api/v1/notes');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);

      const note = response.body.data[0];
      expect(note).toHaveProperty('id');
      expect(note).toHaveProperty('title', 'My Note');
      expect(note).toHaveProperty('content', 'My note content');
      expect(note).toHaveProperty('createdAt');
      expect(note).toHaveProperty('updatedAt');
    });

    it('returns createdAt and updatedAt as ISO 8601 strings', async () => {
      await seedNote({ title: 'ISO Date Test', content: 'Content' });

      const response = await request.get('/api/v1/notes');

      expect(response.status).toBe(200);
      const note = response.body.data[0];

      expect(typeof note.createdAt).toBe('string');
      expect(typeof note.updatedAt).toBe('string');

      // Verify they parse to valid dates and round-trip correctly as ISO strings
      const parsedCreatedAt = new Date(note.createdAt);
      const parsedUpdatedAt = new Date(note.updatedAt);

      expect(parsedCreatedAt.toISOString()).toBe(note.createdAt);
      expect(parsedUpdatedAt.toISOString()).toBe(note.updatedAt);
    });

    it('returns id as a string field on each note', async () => {
      await seedNote();

      const response = await request.get('/api/v1/notes');

      expect(response.status).toBe(200);
      const note = response.body.data[0];
      expect(typeof note.id).toBe('string');
    });
  });
});
