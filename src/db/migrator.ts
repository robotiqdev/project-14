import Database from 'better-sqlite3';

export interface Migration {
  name: string;
  up(db: Database.Database): void;
}

export function getAppliedMigrations(db: Database.Database): string[] {
  throw new Error('Not implemented');
}

export function runMigrations(migrations?: Migration[]): void {
  throw new Error('Not implemented');
}
