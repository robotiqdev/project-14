import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    next();
  };
}
