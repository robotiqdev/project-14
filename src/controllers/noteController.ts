import { Request, Response, NextFunction } from 'express';
import { updateNoteById } from '../services/noteService';

export function updateNote(req: Request, res: Response, next: NextFunction): void {
  const id = req.params.id as string;
  const { title, body } = req.body;

  const patch: { title?: string; body?: string } = {};
  if (title !== undefined) patch.title = title;
  if (body !== undefined) patch.body = body;

  updateNoteById(id, patch)
    .then(note => res.json(note))
    .catch(next);
}
