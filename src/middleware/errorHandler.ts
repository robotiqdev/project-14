import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/AppError';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ValidationError) {
    res.status(422).json({
      code: 'VALIDATION_ERROR',
      details: err.details,
    });
    return;
  }

  // Handle JSON parse errors from express.json()
  if (
    err instanceof SyntaxError &&
    (err as unknown as Record<string, unknown>)['status'] === 400
  ) {
    res.status(400).json({ code: 'BAD_REQUEST', message: 'Invalid JSON' });
    return;
  }

  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
}
