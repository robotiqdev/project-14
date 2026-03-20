import { Pool } from 'pg';
import { Note } from './note.types';

export class NoteRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<Note[]> {
    const result = await this.pool.query<Note>(
      'SELECT * FROM notes ORDER BY created_at DESC',
    );
    return result.rows;
  }

  async findById(id: string): Promise<Note | null> {
    const result = await this.pool.query<Note>(
      'SELECT * FROM notes WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }
}
