import { Request, Response, NextFunction } from 'express';

export class NoteController {
  listNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    next(new Error('Not implemented'));
  };

  getNoteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    next(new Error('Not implemented'));
  };
}
