import { randomUUID } from 'crypto';
import { pool } from '../setup';

export interface NoteOverrides {
  id?: string;
  title?: string;
  content?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export async function truncateNotes(): Promise<void> {
  await pool.query('DELETE FROM notes');
}

export async function seedNote(overrides: NoteOverrides = {}): Promise<NoteRecord> {
  const id = overrides.id ?? randomUUID();
  const title = overrides.title ?? 'Test Note';
  const content = overrides.content ?? 'Test content for the note';
  const created_at = overrides.created_at ?? new Date();
  const updated_at = overrides.updated_at ?? new Date();

  const result = await pool.query<NoteRecord>(
    `INSERT INTO notes (id, title, content, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, title, content, created_at, updated_at],
  );

  return result.rows[0];
}
