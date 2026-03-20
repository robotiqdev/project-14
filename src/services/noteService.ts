import { Note } from '../models/note';
import { NoteUpdatePatch, updateNote } from '../repositories/noteRepository';
import { NotFoundError } from '../errors';

export async function updateNoteById(id: string, patch: NoteUpdatePatch): Promise<Note> {
  const note = await updateNote(id, patch);
  if (!note) {
    throw new NotFoundError('Note not found');
  }
  return note;
}
