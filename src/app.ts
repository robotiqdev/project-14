import express, { Express } from 'express';
import { getDatabase } from './config/database';
import { SqliteNoteRepository } from './repositories/sqliteNoteRepository';
import { NoteServiceImpl } from './services/noteServiceImpl';
import { NoteController } from './controllers/noteController';
import { createNoteRouter } from './routes/noteRoutes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  const db = getDatabase();
  const noteRepo = new SqliteNoteRepository(db);
  const noteService = new NoteServiceImpl(noteRepo);
  const noteController = new NoteController(noteService);

  app.use('/api/notes', createNoteRouter(noteController));

  app.use(errorHandler);

  return app;
}
