import Database from 'better-sqlite3';
import path from 'node:path';
import { configureDatabase, type DatabaseConnection } from '@main/database/database';
import { runMigrations } from '@main/database/migration-runner';

export function createMigratedMemoryDatabase(): DatabaseConnection {
  const database = new Database(':memory:');
  configureDatabase(database);
  runMigrations(database, {
    migrationsDirectory: path.resolve('src/main/database/migrations'),
    executedAt: () => '2026-06-21T00:00:00.000Z'
  });

  return database;
}
