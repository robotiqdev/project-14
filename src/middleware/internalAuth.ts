import { Request, Response, NextFunction } from 'express';

export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  throw new Error('Not implemented');
}
