import { Request, Response, NextFunction } from 'express';

export const validateUUID = (paramName: string) => {
  return (_req: Request, _res: Response, _next: NextFunction): void => {
    // Stub — not implemented
    throw new Error('validateUUID middleware not implemented');
  };
};
