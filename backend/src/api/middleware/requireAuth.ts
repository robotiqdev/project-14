import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(_req: Request, _res: Response, _next: NextFunction): void {
  throw new Error('Not implemented');
}
