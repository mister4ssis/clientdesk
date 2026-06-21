import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { DatabaseConnection } from './database';

interface Migration {
  version: number;
  name: string;
  sql: string;
}

interface MigrationRow {
  version: number;
}

interface RunMigrationsOptions {
  migrationsDirectory?: string;
  executedAt?: () => string;
}

const migrationFilePattern = /^(\d+)-(.+)\.sql$/;

export function runMigrations(
  database: DatabaseConnection,
  options: RunMigrationsOptions = {}
): void {
  ensureSchemaMigrationsTable(database);

  const migrationsDirectory = options.migrationsDirectory ?? getDefaultMigrationsDirectory();
  const migrations = loadMigrations(migrationsDirectory);
  const appliedVersions = getAppliedVersions(database);
  const executedAt = options.executedAt ?? (() => new Date().toISOString());

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      applyMigration(database, migration, executedAt());
      appliedVersions.add(migration.version);
    }
  }
}

export function ensureSchemaMigrationsTable(database: DatabaseConnection): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at TEXT NOT NULL
    );
  `);
}

export function getDefaultMigrationsDirectory(): string {
  const configuredDirectory = process.env.CLIENTDESK_MIGRATIONS_DIR;

  if (configuredDirectory) {
    return configuredDirectory;
  }

  const sourceDirectory = path.join(process.cwd(), 'src', 'main', 'database', 'migrations');

  if (existsSync(sourceDirectory)) {
    return sourceDirectory;
  }

  return path.join(process.resourcesPath, 'migrations');
}

function loadMigrations(migrationsDirectory: string): Migration[] {
  return readdirSync(migrationsDirectory)
    .filter((fileName) => migrationFilePattern.test(fileName))
    .map((fileName) => {
      const match = migrationFilePattern.exec(fileName);

      if (!match) {
        throw new Error(`Invalid migration file name: ${fileName}`);
      }

      return {
        version: Number(match[1]),
        name: match[2],
        sql: readFileSync(path.join(migrationsDirectory, fileName), 'utf8')
      };
    })
    .sort((left, right) => left.version - right.version);
}

function getAppliedVersions(database: DatabaseConnection): Set<number> {
  const rows = database.prepare('SELECT version FROM schema_migrations').all() as MigrationRow[];

  return new Set(rows.map((row) => row.version));
}

function applyMigration(
  database: DatabaseConnection,
  migration: Migration,
  executedAt: string
): void {
  const transaction = database.transaction(() => {
    database.exec(migration.sql);
    database
      .prepare(
        `
          INSERT INTO schema_migrations (version, name, executed_at)
          VALUES (?, ?, ?)
        `
      )
      .run(migration.version, migration.name, executedAt);
  });

  transaction();
}
