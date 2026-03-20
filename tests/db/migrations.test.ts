import { getDb, closeDb, applySchema } from '../../src/db';
import { runMigrations, getAppliedMigrations, Migration } from '../../src/db/migrator';

describe('Database Migration Runner', () => {
  beforeEach(() => {
    process.env.DB_PATH = ':memory:';
    getDb();
    applySchema();
  });

  afterEach(() => {
    closeDb();
  });

  describe('runMigrations()', () => {
    it('completes without throwing when no migration files exist (empty migrations list)', () => {
      expect(() => runMigrations([])).not.toThrow();
    });

    it('applies a migration and creates the specified table', () => {
      const migration: Migration = {
        name: '001_test',
        up: (db) => db.exec('CREATE TABLE test_table (id INTEGER PRIMARY KEY)'),
      };

      runMigrations([migration]);

      const db = getDb();
      const tableRow = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'")
        .get();
      expect(tableRow).toBeDefined();
    });

    it('records the migration name in the migrations table after applying', () => {
      const migration: Migration = {
        name: '001_test',
        up: (db) => db.exec('CREATE TABLE test_table (id INTEGER PRIMARY KEY)'),
      };

      runMigrations([migration]);

      const db = getDb();
      const applied = getAppliedMigrations(db);
      expect(applied).toContain('001_test');
    });

    it('is idempotent — calling runMigrations() twice does not re-apply already-recorded migrations', () => {
      const migration: Migration = {
        name: '001_test',
        up: (db) => db.exec('CREATE TABLE test_table (id INTEGER PRIMARY KEY)'),
      };

      runMigrations([migration]);
      // Second call should not throw even though migration is already applied
      expect(() => runMigrations([migration])).not.toThrow();

      const db = getDb();
      const applied = getAppliedMigrations(db);
      // Migration row should only appear once
      const count = applied.filter((name) => name === '001_test').length;
      expect(count).toBe(1);
    });

    it('throws when a migration up() function throws an error', () => {
      const failingMigration: Migration = {
        name: '001_failing',
        up: () => {
          throw new Error('Intentional migration failure');
        },
      };

      expect(() => runMigrations([failingMigration])).toThrow();
    });

    it('does NOT record a failing migration as applied (transaction rollback)', () => {
      const failingMigration: Migration = {
        name: '001_failing',
        up: () => {
          throw new Error('Intentional migration failure');
        },
      };

      try {
        runMigrations([failingMigration]);
      } catch {
        // expected to throw
      }

      const db = getDb();
      const applied = getAppliedMigrations(db);
      expect(applied).not.toContain('001_failing');
    });

    it('applies multiple migrations in order and records all of them', () => {
      const migrations: Migration[] = [
        {
          name: '001_create_users',
          up: (db) => db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY)'),
        },
        {
          name: '002_create_posts',
          up: (db) => db.exec('CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER)'),
        },
      ];

      runMigrations(migrations);

      const db = getDb();
      const applied = getAppliedMigrations(db);
      expect(applied).toContain('001_create_users');
      expect(applied).toContain('002_create_posts');
    });

    it('skips migrations that are already recorded, only applying new ones', () => {
      const firstMigration: Migration = {
        name: '001_create_users',
        up: (db) => db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY)'),
      };
      const secondMigration: Migration = {
        name: '002_create_posts',
        up: (db) => db.exec('CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER)'),
      };

      // Apply first migration
      runMigrations([firstMigration]);

      // Apply both — first should be skipped, second applied
      runMigrations([firstMigration, secondMigration]);

      const db = getDb();
      const applied = getAppliedMigrations(db);
      const firstCount = applied.filter((n) => n === '001_create_users').length;
      expect(firstCount).toBe(1);
      expect(applied).toContain('002_create_posts');
    });
  });

  describe('getAppliedMigrations()', () => {
    it('returns an empty array when no migrations have been applied', () => {
      const db = getDb();
      const applied = getAppliedMigrations(db);
      expect(Array.isArray(applied)).toBe(true);
      expect(applied).toHaveLength(0);
    });

    it('returns an array of migration names that have been applied', () => {
      const migration: Migration = {
        name: '001_test',
        up: (db) => db.exec('CREATE TABLE test_table (id INTEGER PRIMARY KEY)'),
      };

      runMigrations([migration]);

      const db = getDb();
      const applied = getAppliedMigrations(db);
      expect(Array.isArray(applied)).toBe(true);
      expect(applied).toEqual(expect.arrayContaining(['001_test']));
    });

    it('returns migration names ordered by insertion (ascending id)', () => {
      const migrations: Migration[] = [
        {
          name: '001_first',
          up: (db) => db.exec('CREATE TABLE first_table (id INTEGER PRIMARY KEY)'),
        },
        {
          name: '002_second',
          up: (db) => db.exec('CREATE TABLE second_table (id INTEGER PRIMARY KEY)'),
        },
      ];

      runMigrations(migrations);

      const db = getDb();
      const applied = getAppliedMigrations(db);
      expect(applied[0]).toBe('001_first');
      expect(applied[1]).toBe('002_second');
    });
  });
});
