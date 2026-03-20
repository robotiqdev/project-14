import { Note } from '../models/note';
import { db } from '../db/connection';

export interface NoteUpdatePatch {
  title?: string;
  body?: string;
}

export async function updateNote(id: string, patch: NoteUpdatePatch): Promise<Note | null> {
  const fields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (patch.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    params.push(patch.title);
  }

  if (patch.body !== undefined) {
    fields.push(`body = $${paramIndex++}`);
    params.push(patch.body);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `UPDATE notes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const result = await db.query(sql, params);

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0] as Note;
}
