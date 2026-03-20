import { Note } from '../models/note';
import { NoteUpdatePatch } from '../repositories/noteRepository';

export async function updateNoteById(id: string, patch: NoteUpdatePatch): Promise<Note> {
  throw new Error('Not implemented');
}
