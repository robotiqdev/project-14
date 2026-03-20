import { Router } from 'express';
import { updateNote } from '../controllers/noteController';
import { validateNoteUpdate } from '../middleware/validateNoteUpdate';

const router = Router();

router.patch('/:id', validateNoteUpdate, updateNote);

export default router;
