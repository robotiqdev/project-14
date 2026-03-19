import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const requireAdmin = (
  _req: Request,
  _res: Response,
  _next: NextFunction
): void => {
  // Stub — not implemented
  throw new Error('requireAdmin middleware not implemented');
};
