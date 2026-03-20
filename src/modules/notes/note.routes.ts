import { Router } from 'express';
import { pool } from '../../db/index';
import { NoteRepository } from './note.repository';
import { NoteService } from './note.service';
import { NoteController } from './note.controller';

const router = Router();

const noteRepository = new NoteRepository(pool);
const noteService = new NoteService(noteRepository);
const noteController = new NoteController(noteService);

router.get('/', noteController.listNotes);
router.get('/:id', noteController.getNoteById);

export default router;
