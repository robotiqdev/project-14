import { Request, Response, NextFunction } from 'express';

export function validateCreateComment(req: Request, res: Response, next: NextFunction): void {
  const { body, parentCommentId } = req.body;

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    res.status(400).json({ error: 'body is required and must be a non-empty string' });
    return;
  }

  if (body.length > 10000) {
    res.status(400).json({ error: 'body must not exceed 10000 characters' });
    return;
  }

  if (parentCommentId !== undefined) {
    const cuidRegex = /^c[a-z0-9]{24}$/;
    if (typeof parentCommentId !== 'string' || !cuidRegex.test(parentCommentId)) {
      res.status(400).json({ error: 'parentCommentId must be a valid cuid' });
      return;
    }
  }

  next();
}

export function validateUpdateComment(req: Request, res: Response, next: NextFunction): void {
  const { body } = req.body;

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    res.status(400).json({ error: 'body is required and must be a non-empty string' });
    return;
  }

  if (body.length > 10000) {
    res.status(400).json({ error: 'body must not exceed 10000 characters' });
    return;
  }

  next();
}
