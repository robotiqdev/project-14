import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors';

export function validateNoteUpdate(req: Request, res: Response, next: NextFunction): void {
  const body = req.body || {};
  const hasTitle = body.title !== undefined;
  const hasBody = body.body !== undefined;

  if (!hasTitle && !hasBody) {
    return next(new ValidationError('At least one field (title or body) must be provided', ['No valid fields in request body']));
  }

  if (hasTitle && body.title === '') {
    return next(new ValidationError('Title cannot be empty', ['title must not be empty']));
  }

  next();
}
