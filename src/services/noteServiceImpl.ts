import { NoteService } from './noteService';
import { SqliteNoteRepository } from '../repositories/sqliteNoteRepository';

export class NoteServiceImpl implements NoteService {
  constructor(private readonly repo: SqliteNoteRepository) {}

  createNote(data: unknown): unknown {
    const d = data as Record<string, unknown>;
    const title = typeof d.title === 'string' ? d.title.trim() : '';
    const body =
      typeof d.body === 'string'
        ? d.body
        : typeof d.content === 'string'
          ? d.content
          : '';

    return this.repo.create({ title, body });
  }
}
