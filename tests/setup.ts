import { Pool } from 'pg';
import supertest from 'supertest';
import app from '../src/app';

export const pool = new Pool({
  connectionString:
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/notes_test',
});

export const request = supertest(app);

beforeAll(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
});

afterAll(async () => {
  await pool.end();
});
