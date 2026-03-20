import { RequestHandler } from 'express';
import { validateCreateNote, createNote } from '../services/noteService';
import { CreateNoteInput } from '../models/note';

export const createNoteHandler: RequestHandler = (req, res, next) => {
  try {
    validateCreateNote(req.body);
    const note = createNote(req.body as CreateNoteInput);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
};
