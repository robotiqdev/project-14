import Database = require('better-sqlite3');

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type CreateNoteInput = { title: string; content: string };
export type UpdateNoteInput = { title?: string; content?: string };

export function createNotesTable(db: Database.Database): void {
  // not implemented
}
