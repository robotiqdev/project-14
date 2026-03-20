import Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  throw new Error('Not implemented');
}

export function closeDb(): void {
  throw new Error('Not implemented');
}
