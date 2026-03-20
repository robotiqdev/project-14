import Database = require('better-sqlite3');
import { getDb } from './connection';

export interface Migration {
  name: string;
  up(db: Database.Database): void;
}

export function getAppliedMigrations(db: Database.Database): string[] {
  const rows = db.prepare('SELECT name FROM migrations ORDER BY id ASC').all() as { name: string }[];
  return rows.map((r) => r.name);
}

export function runMigrations(migrations?: Migration[]): void {
  const db = getDb();

  let migrationsToRun: Migration[];
  if (migrations === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ALL_MIGRATIONS } = require('./migrations') as { ALL_MIGRATIONS: Migration[] };
    migrationsToRun = ALL_MIGRATIONS;
  } else {
    migrationsToRun = migrations;
  }

  const applied = new Set(getAppliedMigrations(db));

  for (const migration of migrationsToRun) {
    if (applied.has(migration.name)) {
      continue;
    }

    db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
    })();

    console.log(`Applied migration: ${migration.name}`);
  }
}
