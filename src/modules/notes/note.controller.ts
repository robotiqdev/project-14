import { Request, Response, NextFunction } from 'express';
import { NoteService } from './note.service';
import { Note } from './note.types';
import { ApiNote } from './note.types';
import { ValidationError } from '../../errors/ValidationError';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  listNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const notes = await this.noteService.findAll();
      const apiNotes = notes.map(this.mapNoteToApiNote);
      res.status(200).json({ status: 'success', data: apiNotes, count: apiNotes.length });
    } catch (err) {
      next(err);
    }
  };

  getNoteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!UUID_REGEX.test(id)) {
        throw new ValidationError('Invalid UUID format', 'INVALID_UUID');
      }
      const note = await this.noteService.findById(id);
      res.status(200).json({ status: 'success', data: this.mapNoteToApiNote(note) });
    } catch (err) {
      next(err);
    }
  };

  private mapNoteToApiNote(note: Note): ApiNote {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.created_at instanceof Date ? note.created_at.toISOString() : new Date(note.created_at).toISOString(),
      updatedAt: note.updated_at instanceof Date ? note.updated_at.toISOString() : new Date(note.updated_at).toISOString(),
    };
  }
}
