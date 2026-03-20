import { Router } from 'express';
import { deleteNoteHandler } from '../controllers/notes.controller';

const router = Router();

router.delete('/:id', deleteNoteHandler);

export default router;
