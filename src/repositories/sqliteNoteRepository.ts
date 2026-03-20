import * as BetterSqlite3 from 'better-sqlite3';

export interface Note {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  title: string;
  body: string;
}

export class SqliteNoteRepository {
  constructor(private readonly db: BetterSqlite3.Database) {}

  create(data: CreateNoteData): Note {
    const now = Date.now();
    const stmt = this.db.prepare(
      'INSERT INTO notes (title, body, created_at, updated_at) VALUES (?, ?, ?, ?)',
    );
    const result = stmt.run(data.title, data.body, now, now);
    const id = Number(result.lastInsertRowid);

    return {
      id,
      title: data.title,
      body: data.body,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
  }
}
