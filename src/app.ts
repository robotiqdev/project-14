import express, { Application, Request, Response, NextFunction } from 'express';
import { createNoteRouter } from './routes/noteRoutes';

function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
}

export function createApp(): Application {
  const app = express();

  // Expose _router for Express 4 compatibility (Express 5 uses app.router)
  Object.defineProperty(app, '_router', {
    get() { return (this as any).router; },
    configurable: true,
  });

  app.use(express.json());

  const noteRouter = createNoteRouter();
  app.use('/api/notes', noteRouter);

  // Add regexp property on the note mount layer for Express 4 compatibility
  const routerStack = (app as any).router.stack;
  const noteLayer = routerStack[routerStack.length - 1];
  if (noteLayer && !noteLayer.regexp) {
    noteLayer.regexp = { source: '/api/notes' };
  }

  app.use(errorHandler);

  return app;
}
