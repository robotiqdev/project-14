import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import { errorHandler } from '../errorHandler';
import { AppError } from '../../errors/AppError';
import { ValidationError } from '../../errors/ValidationError';
import { ErrorResponse } from '../../errors/formatErrorResponse';

/**
 * Creates a minimal Express app with a single GET /test route and the
 * errorHandler registered as the last middleware.
 */
function buildApp(
  routeHandler: (req: Request, res: Response, next: NextFunction) => void,
): express.Application {
  const app = express();
  app.get('/test', routeHandler);
  // errorHandler MUST be registered after all routes (Express convention)
  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  describe('AppError handling', () => {
    it('responds with HTTP 404 when the route throws AppError with statusCode 404', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new AppError(404, 'Resource not found'));
      });

      const res = await request(app).get('/test');

      expect(res.status).toBe(404);
    });

    it('responds with JSON content-type when route throws AppError', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new AppError(404, 'Resource not found'));
      });

      const res = await request(app).get('/test');

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('response body contains statusCode field matching the AppError statusCode', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new AppError(404, 'Resource not found'));
      });

      const res = await request(app).get('/test');
      const body: ErrorResponse = res.body;

      expect(body.statusCode).toBe(404);
    });

    it('response body contains message field matching the AppError message', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new AppError(404, 'Resource not found'));
      });

      const res = await request(app).get('/test');
      const body: ErrorResponse = res.body;

      expect(body.message).toBe('Resource not found');
    });

    it('response body contains isOperational=true for AppError', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new AppError(404, 'Resource not found'));
      });

      const res = await request(app).get('/test');
      const body: ErrorResponse = res.body;

      expect(body.isOperational).toBe(true);
    });

    it('response body matches the full ErrorResponse shape for AppError', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new AppError(404, 'Resource not found'));
      });

      const res = await request(app).get('/test');
      const body: ErrorResponse = res.body;

      expect(body).toMatchObject({
        statusCode: 404,
        message: 'Resource not found',
        isOperational: true,
      });
    });

    it('does not include HTML in the response body for AppError', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new AppError(404, 'Resource not found'));
      });

      const res = await request(app).get('/test');

      expect(typeof res.body).toBe('object');
      expect(res.text).not.toMatch(/<html/i);
      expect(res.text).not.toMatch(/<!DOCTYPE/i);
    });
  });

  describe('ValidationError handling', () => {
    it('responds with HTTP 422 when route throws ValidationError', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new ValidationError('Validation failed', [{ field: 'email', message: 'Invalid email' }]));
      });

      const res = await request(app).get('/test');

      expect(res.status).toBe(422);
    });

    it('response body contains details as an array for ValidationError', async () => {
      const validationDetails = [
        { field: 'email', message: 'Invalid email' },
        { field: 'name', message: 'Name is required' },
      ];
      const app = buildApp((_req, _res, next) => {
        next(new ValidationError('Validation failed', validationDetails));
      });

      const res = await request(app).get('/test');
      const body = res.body;

      expect(Array.isArray(body.details)).toBe(true);
    });

    it('response body details array contains the validation error items', async () => {
      const validationDetails = [
        { field: 'email', message: 'Invalid email' },
      ];
      const app = buildApp((_req, _res, next) => {
        next(new ValidationError('Validation failed', validationDetails));
      });

      const res = await request(app).get('/test');
      const body = res.body;

      expect(body.details).toEqual(validationDetails);
    });

    it('response body matches ErrorResponse shape for ValidationError', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new ValidationError('Validation failed', [{ field: 'x', message: 'required' }]));
      });

      const res = await request(app).get('/test');
      const body = res.body;

      expect(body).toMatchObject({
        statusCode: 422,
        message: 'Validation failed',
        isOperational: true,
      });
      expect(Array.isArray(body.details)).toBe(true);
    });

    it('responds with JSON content-type for ValidationError', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new ValidationError('Validation failed', []));
      });

      const res = await request(app).get('/test');

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('plain Error (non-AppError) handling', () => {
    it('responds with HTTP 500 when route throws a plain Error', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new Error('Unexpected crash'));
      });

      const res = await request(app).get('/test');

      expect(res.status).toBe(500);
    });

    it('response body has isOperational=false for plain Error', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new Error('Unexpected crash'));
      });

      const res = await request(app).get('/test');
      const body: ErrorResponse = res.body;

      expect(body.isOperational).toBe(false);
    });

    it('response body statusCode is 500 for plain Error', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new Error('Unexpected crash'));
      });

      const res = await request(app).get('/test');
      const body: ErrorResponse = res.body;

      expect(body.statusCode).toBe(500);
    });

    it('wraps plain Error in an internal error and returns JSON (not HTML) for plain Error', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new Error('Unexpected crash'));
      });

      const res = await request(app).get('/test');

      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.text).not.toMatch(/<html/i);
    });

    it('response body matches ErrorResponse shape for plain Error', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new Error('Unexpected crash'));
      });

      const res = await request(app).get('/test');
      const body = res.body;

      expect(body).toMatchObject({
        statusCode: 500,
        isOperational: false,
      });
      expect(typeof body.message).toBe('string');
    });
  });

  describe('response format guarantees', () => {
    it('Content-Type header is application/json for all error types', async () => {
      const scenarios = [
        new AppError(400, 'Bad request'),
        new ValidationError('Invalid input', []),
        new Error('Unknown error'),
      ];

      for (const err of scenarios) {
        const app = buildApp((_req, _res, next) => next(err));
        const res = await request(app).get('/test');
        expect(res.headers['content-type']).toMatch(/application\/json/);
      }
    });

    it('does not return an HTML error page for any error type', async () => {
      const scenarios = [
        new AppError(403, 'Forbidden'),
        new ValidationError('Bad data', []),
        new Error('Something broke'),
      ];

      for (const err of scenarios) {
        const app = buildApp((_req, _res, next) => next(err));
        const res = await request(app).get('/test');
        expect(res.text).not.toMatch(/<html/i);
        expect(res.text).not.toMatch(/<!DOCTYPE/i);
        expect(res.text).not.toContain('<body>');
      }
    });

    it('response body always contains statusCode, message, and isOperational fields', async () => {
      const scenarios = [
        new AppError(400, 'Bad request'),
        new ValidationError('Invalid', []),
        new Error('Crash'),
      ];

      for (const err of scenarios) {
        const app = buildApp((_req, _res, next) => next(err));
        const res = await request(app).get('/test');
        const body = res.body;

        expect(body).toHaveProperty('statusCode');
        expect(body).toHaveProperty('message');
        expect(body).toHaveProperty('isOperational');
        expect(typeof body.statusCode).toBe('number');
        expect(typeof body.message).toBe('string');
        expect(typeof body.isOperational).toBe('boolean');
      }
    });

    it('does not leak the Express default HTML error page for unhandled errors', async () => {
      const app = buildApp((_req, _res, next) => {
        next(new Error('Totally unexpected'));
      });

      const res = await request(app).get('/test');

      // Express default error handler returns HTML like "Error: ..." wrapped in HTML
      expect(res.headers['content-type']).not.toMatch(/text\/html/);
      expect(res.text).not.toMatch(/Error: Totally unexpected/);
      // The response should be structured JSON
      expect(res.body).toBeDefined();
      expect(typeof res.body).toBe('object');
    });
  });

  describe('errorHandler function signature', () => {
    it('errorHandler is a function exported from the module', () => {
      expect(typeof errorHandler).toBe('function');
    });

    it('errorHandler accepts exactly 4 parameters (Express error handler contract)', () => {
      // Express identifies error handlers by the arity (4 params)
      expect(errorHandler.length).toBe(4);
    });
  });
});
