import express, { Application, Request, Response, NextFunction } from 'express';
import { createTaskRouter } from './api/routes/task.routes';
import { ITaskArchiveService } from './services/task-archive.service';
import { AppError } from './errors/app-errors';

export function createApp(taskArchiveService: ITaskArchiveService): Application {
  const app = express();

  app.use(express.json());

  app.use('/api/tasks', createTaskRouter(taskArchiveService));

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
