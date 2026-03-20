import { Router } from 'express';
import { createNoteHandler } from '../controllers/notesController';

const router = Router();

router.post('/', createNoteHandler);

export default router;
