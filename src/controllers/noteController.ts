import { Request, Response, NextFunction } from 'express';

export async function updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  next(new Error('Not implemented'));
}
