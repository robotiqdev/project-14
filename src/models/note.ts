export interface Note {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  title: string;
  body: string;
}

export interface NoteRow {
  id: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export function mapRowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
