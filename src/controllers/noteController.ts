import { Request, Response, NextFunction } from 'express';
import { NoteService } from '../services/noteService';

export class NoteController {
  constructor(private readonly service: NoteService) {}

  create = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const note = this.service.createNote(req.body);
      res.status(201).json(note);
    } catch (err) {
      next(err);
    }
  };
}
