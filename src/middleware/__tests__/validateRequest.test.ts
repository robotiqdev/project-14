import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as request from 'supertest';
import { z } from 'zod';
import { validateBody, validateParams } from '../validateRequest';

// ─── Test Schemas ────────────────────────────────────────────────────────────

const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string(),
});

const noteIdSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

// ─── Shared Error Handler ────────────────────────────────────────────────────

function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err && err.code === 'VALIDATION_ERROR') {
    res.status(422).json({
      success: false,
      error: {
        code: err.code,
        details: err.details,
      },
    });
    return;
  }

  // Express body-parser SyntaxError (malformed JSON)
  if (
    err instanceof SyntaxError ||
    err.type === 'entity.parse.failed' ||
    err.status === 400
  ) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MALFORMED_JSON',
        message: 'Invalid JSON in request body',
      },
    });
    return;
  }

  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
}

// ─── Test App Factory ────────────────────────────────────────────────────────

function createTestApp(): express.Application {
  const app = express();
  app.use(express.json());

  app.post(
    '/notes',
    validateBody(createNoteSchema),
    (req: Request, res: Response) => {
      res.json({ success: true, validatedBody: req.validatedBody });
    },
  );

  app.get(
    '/notes/:id',
    validateParams(noteIdSchema),
    (req: Request, res: Response) => {
      res.json({ success: true, params: req.params });
    },
  );

  app.use(errorHandler);

  return app;
}

// ─── validateBody Tests ───────────────────────────────────────────────────────

describe('validateBody middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  // ── Valid body ────────────────────────────────────────────────────────────

  it('should call next() and set req.validatedBody when body is valid', async () => {
    const validBody = { title: 'Test Note', content: 'Test content' };

    const response = await request(app)
      .post('/notes')
      .send(validBody)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.validatedBody).toEqual(validBody);
  });

  it('should make validated data available to downstream route handler', async () => {
    const validBody = { title: 'Hello', content: 'World' };

    const response = await request(app).post('/notes').send(validBody);

    expect(response.status).toBe(200);
    expect(response.body.validatedBody).toBeDefined();
    expect(response.body.validatedBody.title).toBe('Hello');
    expect(response.body.validatedBody.content).toBe('World');
  });

  it('should strip extra fields not defined in schema', async () => {
    const bodyWithExtras = {
      title: 'Test Note',
      content: 'Content',
      extraField: 'should be stripped',
      anotherExtra: 42,
    };

    const response = await request(app)
      .post('/notes')
      .send(bodyWithExtras)
      .expect(200);

    expect(response.body.validatedBody).not.toHaveProperty('extraField');
    expect(response.body.validatedBody).not.toHaveProperty('anotherExtra');
    expect(response.body.validatedBody).toEqual({
      title: 'Test Note',
      content: 'Content',
    });
  });

  // ── Invalid body ──────────────────────────────────────────────────────────

  it('should respond 422 with VALIDATION_ERROR when required fields are missing', async () => {
    const response = await request(app)
      .post('/notes')
      .send({})
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toBeInstanceOf(Array);
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it('should respond 422 when only some required fields are missing', async () => {
    const response = await request(app)
      .post('/notes')
      .send({ content: 'Missing title' })
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should include field-level path information in validation details', async () => {
    const response = await request(app)
      .post('/notes')
      .send({ content: 'Missing title' })
      .expect(422);

    expect(response.body.error.details).toBeInstanceOf(Array);
    const hasTitleError = response.body.error.details.some(
      (d: any) =>
        (Array.isArray(d.path) && d.path.includes('title')) ||
        d.path === 'title' ||
        d.field === 'title',
    );
    expect(hasTitleError).toBe(true);
  });

  it('should respond 422 when field value is the wrong type', async () => {
    const response = await request(app)
      .post('/notes')
      .send({ title: 123, content: 'Content' })
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should respond 422 when title is an empty string (min length violation)', async () => {
    const response = await request(app)
      .post('/notes')
      .send({ title: '', content: 'Some content' })
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should respond with Content-Type application/json for 422 errors', async () => {
    const response = await request(app)
      .post('/notes')
      .send({})
      .expect(422);

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('should not call the route handler when body is invalid', async () => {
    const handlerSpy = jest.fn((req: Request, res: Response) => {
      res.json({ reached: true });
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.post('/test', validateBody(createNoteSchema), handlerSpy);
    testApp.use(errorHandler);

    await request(testApp).post('/test').send({}).expect(422);

    expect(handlerSpy).not.toHaveBeenCalled();
  });

  // ── Malformed JSON ────────────────────────────────────────────────────────

  it('should respond 400 when request body contains malformed JSON', async () => {
    const response = await request(app)
      .post('/notes')
      .set('Content-Type', 'application/json')
      .send('{ "title": "test", invalid }')
      .expect(400);

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('should respond 400 with Content-Type application/json for malformed JSON', async () => {
    const response = await request(app)
      .post('/notes')
      .set('Content-Type', 'application/json')
      .send('not-json-at-all')
      .expect(400);

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});

// ─── validateParams Tests ────────────────────────────────────────────────────

describe('validateParams middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  // ── Valid UUID ────────────────────────────────────────────────────────────

  it('should call next() when params contain a valid UUID', async () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';

    const response = await request(app)
      .get(`/notes/${validUUID}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.params.id).toBe(validUUID);
  });

  it('should pass params through to downstream handler on valid UUID', async () => {
    const uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    const response = await request(app).get(`/notes/${uuid}`);

    expect(response.status).toBe(200);
    expect(response.body.params).toBeDefined();
  });

  // ── Invalid params ────────────────────────────────────────────────────────

  it('should respond 422 when id param is not a valid UUID', async () => {
    const response = await request(app)
      .get('/notes/not-a-uuid')
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should respond 422 when id param is a plain string', async () => {
    const response = await request(app)
      .get('/notes/some-random-string')
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toBeInstanceOf(Array);
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it('should respond 422 when id param is a number', async () => {
    const response = await request(app)
      .get('/notes/12345')
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should respond with Content-Type application/json for invalid params', async () => {
    const response = await request(app)
      .get('/notes/invalid-id')
      .expect(422);

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('should not call the route handler when params are invalid', async () => {
    const handlerSpy = jest.fn((req: Request, res: Response) => {
      res.json({ reached: true });
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.get('/items/:id', validateParams(noteIdSchema), handlerSpy);
    testApp.use(errorHandler);

    await request(testApp).get('/items/not-a-uuid').expect(422);

    expect(handlerSpy).not.toHaveBeenCalled();
  });
});
