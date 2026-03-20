import { Router } from 'express';
import Database from 'better-sqlite3';
import { NoteRepository } from '../repositories/noteRepository';
import { NoteController } from '../controllers/noteController';

export function createNoteRouter(): Router {
  const db = new Database(':memory:');
  const repository = new NoteRepository(db);
  const controller = new NoteController(repository);

  const router = Router();

  router.get('/', controller.listNotes);
  router.get('/:id', controller.getNoteById);
  router.post('/', controller.createNote);
  router.put('/:id', controller.updateNote);
  router.delete('/:id', controller.deleteNote);

  return router;
}
