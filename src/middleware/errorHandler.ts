import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}
