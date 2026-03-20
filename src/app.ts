import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import notesRouter from './routes/notes.router';

const app = express();

app.use(express.json());

app.use('/notes', notesRouter);

// Global error handler — registered after routes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
