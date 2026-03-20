import { Request, Response, NextFunction } from 'express';

export function validateNoteUpdate(req: Request, res: Response, next: NextFunction): void {
  next();
}
