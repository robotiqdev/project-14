// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
import notesRouter from './routes/notes';
import { AppError } from './services/noteService';
import { Request, Response, NextFunction } from 'express';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use('/notes', notesRouter);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err.type === 'entity.parse.failed' || err.status === 400) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
