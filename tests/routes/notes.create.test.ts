// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import app from '../../src/app';

describe('POST /notes', () => {
  describe('successful note creation', () => {
    it('returns 201 status with valid title and body', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello', body: 'World' });

      expect(response.status).toBe(201);
    });

    it('returns Content-Type application/json with valid input', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello', body: 'World' });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('returns note with id field in response body', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello', body: 'World' });

      expect(response.body).toHaveProperty('id');
    });

    it('returns note with correct title in response body', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello', body: 'World' });

      expect(response.body.title).toBe('Hello');
    });

    it('returns note with correct body in response body', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello', body: 'World' });

      expect(response.body.body).toBe('World');
    });

    it('returns note with createdAt field in response body', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello', body: 'World' });

      expect(response.body).toHaveProperty('createdAt');
    });

    it('returns note with updatedAt field in response body', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello', body: 'World' });

      expect(response.body).toHaveProperty('updatedAt');
    });

    it('returns complete note object matching the Note interface shape', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello', body: 'World' });

      expect(response.status).toBe(201);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toMatchObject({
        title: 'Hello',
        body: 'World',
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });
  });

  describe('validation errors - missing fields', () => {
    it('returns 422 when title is missing', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ body: 'World' });

      expect(response.status).toBe(422);
    });

    it('returns error message when title is missing', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ body: 'World' });

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });

    it('returns 422 when body is missing', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello' });

      expect(response.status).toBe(422);
    });

    it('returns error message when body is missing', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello' });

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });

    it('returns 422 when both title and body are missing', async () => {
      const response = await request(app)
        .post('/notes')
        .send({});

      expect(response.status).toBe(422);
    });

    it('returns error object when both title and body are missing', async () => {
      const response = await request(app)
        .post('/notes')
        .send({});

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('validation errors - empty string fields', () => {
    it('returns 422 when title is an empty string', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: '', body: 'World' });

      expect(response.status).toBe(422);
    });

    it('returns error message when title is an empty string', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: '', body: 'World' });

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('returns 422 when body is an empty string', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello', body: '' });

      expect(response.status).toBe(422);
    });

    it('returns error message when body is an empty string', async () => {
      const response = await request(app)
        .post('/notes')
        .send({ title: 'Hello', body: '' });

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('validation errors - field length constraints', () => {
    it('returns 422 when title exceeds 255 characters', async () => {
      const longTitle = 'A'.repeat(256);
      const response = await request(app)
        .post('/notes')
        .send({ title: longTitle, body: 'World' });

      expect(response.status).toBe(422);
    });

    it('returns error message when title exceeds 255 characters', async () => {
      const longTitle = 'A'.repeat(256);
      const response = await request(app)
        .post('/notes')
        .send({ title: longTitle, body: 'World' });

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('accepts title of exactly 255 characters', async () => {
      const maxTitle = 'A'.repeat(255);
      const response = await request(app)
        .post('/notes')
        .send({ title: maxTitle, body: 'World' });

      expect(response.status).toBe(201);
    });
  });

  describe('invalid request body', () => {
    it('returns 400 when request body is completely invalid JSON', async () => {
      const response = await request(app)
        .post('/notes')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('returns error object when request body is completely invalid JSON', async () => {
      const response = await request(app)
        .post('/notes')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.body).toHaveProperty('error');
    });

    it('returns 400 for malformed JSON with truncated content', async () => {
      const response = await request(app)
        .post('/notes')
        .set('Content-Type', 'application/json')
        .send('{"title": "Hello", "body":');

      expect(response.status).toBe(400);
    });
  });
});
