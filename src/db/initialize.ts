import { applySchema } from './schema';
import { runMigrations } from './migrator';

export function initializeDatabase(): void {
  applySchema();
  runMigrations();
}
