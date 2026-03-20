import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { InternalError } from '../errors/InternalError';
import { formatErrorResponse } from '../errors/formatErrorResponse';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else {
    console.error('Unhandled error:', err);
    appError = new InternalError('Internal Server Error');
  }

  const formatted = formatErrorResponse(appError);
  res.status(appError.statusCode).json(formatted);
}
