import express, { Request, Response, NextFunction } from 'express';
import { ForbiddenError, ValidationError, NotFoundError } from './errors';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());

  // Central error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.message });
    } else if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
    } else if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return app;
}
