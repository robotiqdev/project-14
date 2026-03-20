import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

function makeValidationError(zodError: import('zod').ZodError) {
  const issues = (zodError as any).issues ?? (zodError as any).errors ?? [];
  const details = issues.map((issue: any) => ({
    path: issue.path,
    message: issue.message,
  }));
  const err: any = new Error('Validation failed');
  err.code = 'VALIDATION_ERROR';
  err.details = details;
  return err;
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      (req as any).validatedBody = result.data;
      next();
    } else {
      next(makeValidationError(result.error));
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (result.success) {
      next();
    } else {
      next(makeValidationError(result.error));
    }
  };
}
