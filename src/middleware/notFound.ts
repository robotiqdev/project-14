import { Request, Response, NextFunction } from 'express';

export function notFound(req: Request, res: Response, next: NextFunction): void {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
}
