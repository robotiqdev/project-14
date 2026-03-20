import { Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError } from '../errors';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message, details: err.details });
  } else {
    res.status(500).json({ error: err.message });
  }
}
