import Database from 'better-sqlite3';
import { NoteRow } from '../types/note';

export class NoteRepository {
  constructor(private readonly db: Database.Database) {}

  getAll(): NoteRow[] {
    throw new Error('Not implemented');
  }

  getById(id: number): NoteRow | undefined {
    throw new Error('Not implemented');
  }

  create(_title: string, _content: string): NoteRow {
    throw new Error('Not implemented');
  }

  update(_id: number, _title: string, _content: string): NoteRow | undefined {
    throw new Error('Not implemented');
  }

  delete(_id: number): boolean {
    throw new Error('Not implemented');
  }
}
