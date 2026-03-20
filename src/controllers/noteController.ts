import { Request, Response, NextFunction } from 'express';
import { NoteRepository } from '../repositories/noteRepository';

export class NoteController {
  constructor(private readonly noteRepository: NoteRepository) {}

  listNotes = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const notes = this.noteRepository.getAll();
      res.json(notes);
    } catch (err) {
      next(err);
    }
  };

  getNoteById = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const note = this.noteRepository.getById(id);
      if (!note) {
        res.status(404).json({ message: 'Note not found' });
        return;
      }
      res.json(note);
    } catch (err) {
      next(err);
    }
  };

  createNote = (req: Request, res: Response, next: NextFunction): void => {
    next(new Error('Not implemented'));
  };

  updateNote = (req: Request, res: Response, next: NextFunction): void => {
    next(new Error('Not implemented'));
  };

  deleteNote = (req: Request, res: Response, next: NextFunction): void => {
    next(new Error('Not implemented'));
  };
}
