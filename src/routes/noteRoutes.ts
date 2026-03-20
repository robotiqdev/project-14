import { Router } from 'express';
import { NoteController } from '../controllers/noteController';
import { validate } from '../middleware/validate';
import { validateCreateNote } from '../validators/noteValidator';

export function createNoteRouter(controller: NoteController): Router {
  const router = Router();
  router.post('/', validate(validateCreateNote), controller.create);
  return router;
}
