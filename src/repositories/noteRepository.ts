import { Note } from '../models/note';
import { db } from '../db/connection';

export interface NoteUpdatePatch {
  title?: string;
  body?: string;
}

export async function updateNote(
  id: string,
  patch: NoteUpdatePatch,
): Promise<Note | null> {
  throw new Error('Not implemented');
}
