import supertest from 'supertest';
import { createApp } from '../../../src/app';

describe('POST /api/notes – integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  let request: ReturnType<typeof supertest>;

  beforeAll(() => {
    process.env.DATABASE_PATH = ':memory:';
    app = createApp();
    request = supertest(app);
  });

  // ─── Happy path ─────────────────────────────────────────────────────────────

  describe('valid request body', () => {
    it('returns HTTP 201', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: 'Hello', body: 'World' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
    });

    it('returns Content-Type application/json', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: 'Hello', body: 'World' })
        .set('Content-Type', 'application/json');

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('response body contains id, title, body, createdAt, updatedAt fields', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: 'Hello', body: 'World' })
        .set('Content-Type', 'application/json');

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('body');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('id is a positive integer', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: 'Hello', body: 'World' })
        .set('Content-Type', 'application/json');

      expect(typeof res.body.id).toBe('number');
      expect(Number.isInteger(res.body.id)).toBe(true);
      expect(res.body.id).toBeGreaterThan(0);
    });

    it('createdAt is a valid ISO 8601 string', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: 'Hello', body: 'World' })
        .set('Content-Type', 'application/json');

      const date = new Date(res.body.createdAt);
      expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(isNaN(date.getTime())).toBe(false);
    });

    it('updatedAt is a valid ISO 8601 string', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: 'Hello', body: 'World' })
        .set('Content-Type', 'application/json');

      const date = new Date(res.body.updatedAt);
      expect(res.body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(isNaN(date.getTime())).toBe(false);
    });

    it('title in response matches trimmed input', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: '  Trimmed Title  ', body: 'Some body' })
        .set('Content-Type', 'application/json');

      expect(res.body.title).toBe('Trimmed Title');
    });

    it('body in response matches the input body', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: 'Note', body: 'My note body' })
        .set('Content-Type', 'application/json');

      expect(res.body.body).toBe('My note body');
    });

    it('two sequential creates produce different ids', async () => {
      const res1 = await request
        .post('/api/notes')
        .send({ title: 'First note', body: 'First body' })
        .set('Content-Type', 'application/json');

      const res2 = await request
        .post('/api/notes')
        .send({ title: 'Second note', body: 'Second body' })
        .set('Content-Type', 'application/json');

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.id).not.toBe(res2.body.id);
    });
  });

  // ─── Validation errors ───────────────────────────────────────────────────────

  describe('missing title', () => {
    it('returns HTTP 422', async () => {
      const res = await request
        .post('/api/notes')
        .send({ body: 'Some body' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(422);
    });

    it('returns VALIDATION_ERROR code in response', async () => {
      const res = await request
        .post('/api/notes')
        .send({ body: 'Some body' })
        .set('Content-Type', 'application/json');

      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('response details.title is an array', async () => {
      const res = await request
        .post('/api/notes')
        .send({ body: 'Some body' })
        .set('Content-Type', 'application/json');

      expect(res.body).toHaveProperty('details');
      expect(Array.isArray(res.body.details.title)).toBe(true);
      expect(res.body.details.title.length).toBeGreaterThan(0);
    });
  });

  describe('missing body', () => {
    it('returns HTTP 422', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: 'Some title' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(422);
    });

    it('response details.body is an array', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: 'Some title' })
        .set('Content-Type', 'application/json');

      expect(res.body).toHaveProperty('details');
      expect(Array.isArray(res.body.details.body)).toBe(true);
      expect(res.body.details.body.length).toBeGreaterThan(0);
    });
  });

  describe('title over 255 characters', () => {
    it('returns HTTP 422', async () => {
      const longTitle = 'a'.repeat(256);
      const res = await request
        .post('/api/notes')
        .send({ title: longTitle, body: 'Some body' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(422);
    });

    it('response details.title is an array', async () => {
      const longTitle = 'a'.repeat(256);
      const res = await request
        .post('/api/notes')
        .send({ title: longTitle, body: 'Some body' })
        .set('Content-Type', 'application/json');

      expect(res.body).toHaveProperty('details');
      expect(Array.isArray(res.body.details.title)).toBe(true);
    });
  });

  describe('body over 10000 characters', () => {
    it('returns HTTP 422', async () => {
      const longBody = 'b'.repeat(10001);
      const res = await request
        .post('/api/notes')
        .send({ title: 'Valid title', body: longBody })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(422);
    });

    it('response details.body is an array', async () => {
      const longBody = 'b'.repeat(10001);
      const res = await request
        .post('/api/notes')
        .send({ title: 'Valid title', body: longBody })
        .set('Content-Type', 'application/json');

      expect(res.body).toHaveProperty('details');
      expect(Array.isArray(res.body.details.body)).toBe(true);
    });
  });

  describe('whitespace-only title', () => {
    it('returns HTTP 422', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: '   ', body: 'Some body' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(422);
    });

    it('response details.title is an array', async () => {
      const res = await request
        .post('/api/notes')
        .send({ title: '   ', body: 'Some body' })
        .set('Content-Type', 'application/json');

      expect(res.body).toHaveProperty('details');
      expect(Array.isArray(res.body.details.title)).toBe(true);
    });
  });

  describe('malformed JSON body', () => {
    it('returns HTTP 400', async () => {
      const res = await request
        .post('/api/notes')
        .send('{ this is not valid json }')
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
    });
  });
});
