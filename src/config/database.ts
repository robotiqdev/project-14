import * as BetterSqlite3 from 'better-sqlite3';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Handle both CJS and ESM interop
const DatabaseConstructor: any = (BetterSqlite3 as any).default ?? BetterSqlite3;

let db: BetterSqlite3.Database | null = null;
let tempFilePath: string | null = null;

export function getDatabase(): BetterSqlite3.Database {
  if (db) {
    return db;
  }

  const envPath = process.env.DATABASE_PATH ?? path.resolve(__dirname, '../../data/notes.db');

  let dbPath: string;
  if (envPath === ':memory:') {
    // WAL journal mode requires a disk file; use a temp file for test isolation
    tempFilePath = path.join(os.tmpdir(), `notes-db-${process.pid}-${Date.now()}.db`);
    dbPath = tempFilePath;
  } else {
    dbPath = envPath;
    tempFilePath = null;
    const dirname = path.dirname(dbPath);
    fs.mkdirSync(dirname, { recursive: true });
  }

  db = new DatabaseConstructor(dbPath) as BetterSqlite3.Database;
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const migrationSQL = fs.readFileSync(
    path.resolve(__dirname, '../db/migrations/001_create_notes.sql'),
    'utf-8',
  );
  db.exec(migrationSQL);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
  if (tempFilePath) {
    try {
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(tempFilePath + '-wal');
      fs.unlinkSync(tempFilePath + '-shm');
    } catch {
      // ignore missing files
    }
    tempFilePath = null;
  }
}
