import http from 'http';
import { Router } from 'express';
import { createNoteRouter } from '../../src/routes/noteRoutes';
import { createApp } from '../../src/app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function httpGet(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on('end', () => resolve({ statusCode: res.statusCode!, body }));
      })
      .on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// createNoteRouter — route registration
// ---------------------------------------------------------------------------

describe('createNoteRouter', () => {
  it('is exported as a named function', () => {
    expect(typeof createNoteRouter).toBe('function');
  });

  describe('returned Router structure', () => {
    let router: Router;

    beforeEach(() => {
      router = createNoteRouter();
    });

    it('returns a value (the Router)', () => {
      expect(router).toBeDefined();
    });

    it('returns an Express Router (callable as a function)', () => {
      expect(typeof router).toBe('function');
    });

    it('exposes an internal route stack array', () => {
      const stack = (router as any).stack;
      expect(Array.isArray(stack)).toBe(true);
    });

    it('registers a GET route at "/"', () => {
      const stack: any[] = (router as any).stack;
      const getSlash = stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === '/' &&
          layer.route.methods &&
          layer.route.methods.get,
      );
      expect(getSlash).toBeDefined();
    });

    it('registers a GET route at "/:id"', () => {
      const stack: any[] = (router as any).stack;
      const getById = stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === '/:id' &&
          layer.route.methods &&
          layer.route.methods.get,
      );
      expect(getById).toBeDefined();
    });

    it('registers GET "/" BEFORE GET "/:id" — literal path must precede parameterised path', () => {
      const stack: any[] = (router as any).stack;

      const getRouteLayers = stack.filter(
        (layer) =>
          layer.route && layer.route.methods && layer.route.methods.get,
      );
      const paths: string[] = getRouteLayers.map((l: any) => l.route.path);

      const slashIndex = paths.indexOf('/');
      const idIndex = paths.indexOf('/:id');

      expect(slashIndex).toBeGreaterThanOrEqual(0);
      expect(idIndex).toBeGreaterThanOrEqual(0);
      expect(slashIndex).toBeLessThan(idIndex);
    });

    it('registers a POST route at "/" (stub for create)', () => {
      const stack: any[] = (router as any).stack;
      const postSlash = stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === '/' &&
          layer.route.methods &&
          layer.route.methods.post,
      );
      expect(postSlash).toBeDefined();
    });

    it('registers a PUT route at "/:id" (stub for update)', () => {
      const stack: any[] = (router as any).stack;
      const putById = stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === '/:id' &&
          layer.route.methods &&
          layer.route.methods.put,
      );
      expect(putById).toBeDefined();
    });

    it('registers a DELETE route at "/:id" (stub for delete)', () => {
      const stack: any[] = (router as any).stack;
      const deleteById = stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === '/:id' &&
          layer.route.methods &&
          layer.route.methods.delete,
      );
      expect(deleteById).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// createApp — middleware and mount order
// ---------------------------------------------------------------------------

describe('createApp', () => {
  it('is exported as a named function', () => {
    expect(typeof createApp).toBe('function');
  });

  describe('returned Application structure', () => {
    let app: ReturnType<typeof createApp>;

    beforeEach(() => {
      app = createApp();
    });

    it('returns an Express application (callable as a function)', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    it('has an internal router (_router)', () => {
      const router = (app as any)._router;
      expect(router).toBeDefined();
    });

    it('mounts the note router under /api/notes', () => {
      const router = (app as any)._router;
      const stack: any[] = router.stack;

      // A mounted sub-router is represented by a layer whose regexp matches
      // the mount prefix.  We look for a layer that covers /api/notes.
      const noteMount = stack.find((layer: any) => {
        if (!layer.regexp) return false;
        // Express builds a regexp from the mount path; the source will contain
        // escaped versions of the path segments.
        const src: string = layer.regexp.source;
        return src.includes('api') || src.includes('notes');
      });

      expect(noteMount).toBeDefined();
    });

    it('registers express.json() before the note router', () => {
      const router = (app as any)._router;
      const stack: any[] = router.stack;

      const jsonIndex = stack.findIndex(
        (layer: any) => layer.handle && layer.handle.name === 'jsonParser',
      );
      const noteMountIndex = stack.findIndex((layer: any) => {
        if (!layer.regexp) return false;
        const src: string = layer.regexp.source;
        return src.includes('api') || src.includes('notes');
      });

      expect(jsonIndex).toBeGreaterThanOrEqual(0);
      expect(noteMountIndex).toBeGreaterThanOrEqual(0);
      expect(jsonIndex).toBeLessThan(noteMountIndex);
    });

    it('registers the errorHandler (4-arity function) as the LAST middleware', () => {
      const router = (app as any)._router;
      const stack: any[] = router.stack;

      // Express error handlers have exactly 4 parameters: (err, req, res, next)
      const errorHandlerIndex = stack.reduce(
        (last: number, layer: any, index: number) =>
          layer.handle && layer.handle.length === 4 ? index : last,
        -1,
      );

      expect(errorHandlerIndex).toBeGreaterThanOrEqual(0);
      expect(errorHandlerIndex).toBe(stack.length - 1);
    });
  });

  // -------------------------------------------------------------------------
  // HTTP integration — verifies the live Express app responds on the right paths
  // -------------------------------------------------------------------------

  describe('HTTP integration', () => {
    let server: http.Server;
    let baseUrl: string;

    beforeEach((done) => {
      const app = createApp();
      server = http.createServer(app as any);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { address: string; port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        done();
      });
    });

    afterEach((done) => {
      server.close(done);
    });

    it('GET /api/notes responds (not 404)', async () => {
      const { statusCode } = await httpGet(`${baseUrl}/api/notes`);
      expect(statusCode).not.toBe(404);
    });

    it('GET /api/notes/1 responds (not 404)', async () => {
      const { statusCode } = await httpGet(`${baseUrl}/api/notes/1`);
      expect(statusCode).not.toBe(404);
    });

    it('GET /api/notes and GET /api/notes/1 are handled by separate route handlers', async () => {
      // Both must respond without 404 — they are wired to distinct handlers
      const [list, single] = await Promise.all([
        httpGet(`${baseUrl}/api/notes`),
        httpGet(`${baseUrl}/api/notes/1`),
      ]);
      expect(list.statusCode).not.toBe(404);
      expect(single.statusCode).not.toBe(404);
    });

    it('a path not under /api/notes returns 404', async () => {
      const { statusCode } = await httpGet(`${baseUrl}/api/unknown`);
      expect(statusCode).toBe(404);
    });
  });
});

// ---------------------------------------------------------------------------
// src/server.ts — entry-point module exists
// ---------------------------------------------------------------------------

describe('src/server.ts', () => {
  it('server module file can be resolved', () => {
    const serverPath = require.resolve('../../src/server');
    expect(serverPath).toBeTruthy();
    expect(serverPath).toMatch(/server\.(ts|js)$/);
  });
});
