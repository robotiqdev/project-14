import { Request, Response, NextFunction } from 'express';
import { NotesService } from '../services/notes.service';
import { NoteNotFoundError } from '../errors/notes.errors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteNoteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;

  if (!UUID_REGEX.test(id)) {
    res.status(400).json({ error: 'Invalid note ID format' });
    return;
  }

  const notesService = new NotesService();
  try {
    await notesService.deleteNote(id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof NoteNotFoundError) {
      res.status(404).json({ error: 'Note not found', noteId: id });
    } else {
      next(err);
    }
  }
}
