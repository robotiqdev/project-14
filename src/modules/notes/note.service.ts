import { NoteRepository } from './note.repository';
import { Note } from './note.types';
import { NotFoundError } from '../../errors/NotFoundError';

export class NoteService {
  constructor(private readonly noteRepository: NoteRepository) {}

  async findAll(): Promise<Note[]> {
    return this.noteRepository.findAll();
  }

  async findById(id: string): Promise<Note> {
    const note = await this.noteRepository.findById(id);
    if (!note) {
      throw new NotFoundError('Note not found', 'NOTE_NOT_FOUND');
    }
    return note;
  }
}
