import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createApp } from '../../src/app';

/**
 * Integration tests for PATCH /notes/:id
 *
 * These tests spin up the Express app (via createApp()) and use a dedicated test
 * database (DATABASE_URL_TEST env var) for seeding / cleanup around each test.
 *
 * Expected response shape for successful operations:
 *   { id, title, body, created_at, updated_at }
 */

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://localhost:5432/notes_test';

const adapter = new PrismaPg({ connectionString: TEST_DB_URL });
const prisma = new PrismaClient({ adapter });

const app = createApp();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEED_NOTE = {
  title: 'Original Title',
  body: 'Original body content',
};

let seededNoteId: string;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(async () => {
  const note = await prisma.note.create({ data: SEED_NOTE });
  seededNoteId = note.id;
});

afterEach(async () => {
  await prisma.note.deleteMany({ where: { id: seededNoteId } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

describe('PATCH /notes/:id', () => {
  describe('successful partial updates', () => {
    it('(a) returns 200 with updated note when only title is changed', async () => {
      const newTitle = 'New Title';

      const response = await request(app)
        .patch(`/notes/${seededNoteId}`)
        .send({ title: newTitle })
        .expect(200);

      const body = response.body;

      // Response shape
      expect(body).toHaveProperty('id', seededNoteId);
      expect(body).toHaveProperty('title', newTitle);
      expect(body).toHaveProperty('body', SEED_NOTE.body); // body unchanged
      expect(body).toHaveProperty('created_at');
      expect(body).toHaveProperty('updated_at');

      // updated_at must be at or after created_at (note was just updated)
      expect(new Date(body.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(body.created_at).getTime(),
      );
    });

    it('(b) returns 200 with updated note when only body is changed', async () => {
      const newBody = 'New body content';

      const response = await request(app)
        .patch(`/notes/${seededNoteId}`)
        .send({ body: newBody })
        .expect(200);

      const body = response.body;

      expect(body).toHaveProperty('id', seededNoteId);
      expect(body).toHaveProperty('title', SEED_NOTE.title); // title unchanged
      expect(body).toHaveProperty('body', newBody);
      expect(body).toHaveProperty('created_at');
      expect(body).toHaveProperty('updated_at');
    });

    it('(c) returns 200 with both fields updated when title and body are provided', async () => {
      const payload = { title: 'T', body: 'B' };

      const response = await request(app)
        .patch(`/notes/${seededNoteId}`)
        .send(payload)
        .expect(200);

      const body = response.body;

      expect(body).toHaveProperty('id', seededNoteId);
      expect(body).toHaveProperty('title', payload.title);
      expect(body).toHaveProperty('body', payload.body);
      expect(body).toHaveProperty('created_at');
      expect(body).toHaveProperty('updated_at');
    });
  });

  describe('validation errors (422)', () => {
    it('(d) returns 422 when body is an empty object (at least one field required)', async () => {
      const response = await request(app)
        .patch(`/notes/${seededNoteId}`)
        .send({})
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.toLowerCase()).toMatch(/at least one/);
    });

    it('(e) returns 422 when title is an empty string', async () => {
      await request(app)
        .patch(`/notes/${seededNoteId}`)
        .send({ title: '' })
        .expect(422);
    });

    it('(g) returns 422 when an unknown field is sent (strict schema)', async () => {
      await request(app)
        .patch(`/notes/${seededNoteId}`)
        .send({ foo: 'bar' })
        .expect(422);
    });

    it('returns 422 when body is an empty string', async () => {
      await request(app)
        .patch(`/notes/${seededNoteId}`)
        .send({ body: '' })
        .expect(422);
    });

    it('returns 422 when title is empty string even with a valid body', async () => {
      await request(app)
        .patch(`/notes/${seededNoteId}`)
        .send({ title: '', body: 'valid body' })
        .expect(422);
    });
  });

  describe('not found (404)', () => {
    it('(f) returns 404 for a non-existent note id', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .patch(`/notes/${nonExistentId}`)
        .send({ title: 'Does not matter' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('response shape', () => {
    it('response contains exactly the expected fields: id, title, body, created_at, updated_at', async () => {
      const response = await request(app)
        .patch(`/notes/${seededNoteId}`)
        .send({ title: 'Shape Check Title' })
        .expect(200);

      const keys = Object.keys(response.body).sort();
      expect(keys).toEqual(['body', 'created_at', 'id', 'title', 'updated_at']);
    });
  });
});
