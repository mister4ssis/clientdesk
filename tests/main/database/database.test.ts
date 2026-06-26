import Database from 'better-sqlite3';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  closeDatabase,
  configureDatabase,
  getDatabase,
  openDatabase,
  getCurrentUserId,
  openDatabaseForUser,
  type DatabaseConnection
} from '@main/database/database';
import { getDatabasePath, getUserDatabasePath } from '@main/database/database-path';
import { runMigrations } from '@main/database/migration-runner';
import { createTempDirectory, removeTempDirectory } from '../../helpers/temp-directory';

interface SqliteNameRow {
  name: string;
}

interface MigrationCountRow {
  count: number;
}

interface MigrationExecutedAtRow {
  executed_at: string;
}

interface TableColumnRow {
  name: string;
}

const tempDirectories: string[] = [];

afterEach(() => {
  closeDatabase();

  for (const directory of tempDirectories.splice(0)) {
    removeTempDirectory(directory);
  }
});

describe('database infrastructure', () => {
  it('opens and closes the centralized database connection', () => {
    const userDataPath = createTrackedTempDirectory('clientdesk-user-data-');
    const databasePath = getDatabasePath(userDataPath);

    const database = openDatabase({ databasePath });

    expect(database.open).toBe(true);
    expect(getDatabase()).toBe(database);
    expect(existsSync(path.dirname(databasePath))).toBe(true);

    closeDatabase();

    expect(database.open).toBe(false);
    expect(() => getDatabase()).toThrow('Database connection has not been opened.');
  });

  it('opens isolated database files per authenticated user', () => {
    const userDataPath = createTrackedTempDirectory('clientdesk-user-data-');
    const userA = '00000000-0000-4000-8000-000000000001';
    const userB = '00000000-0000-4000-8000-000000000002';
    const userAPath = getUserDatabasePath(userA, userDataPath);
    const userBPath = getUserDatabasePath(userB, userDataPath);

    const databaseA = openDatabaseForUser(userA, userDataPath);
    expect(getCurrentUserId()).toBe(userA);
    expect(databaseA.open).toBe(true);

    const databaseB = openDatabaseForUser(userB, userDataPath);
    expect(getCurrentUserId()).toBe(userB);
    expect(databaseA.open).toBe(false);
    expect(databaseB.open).toBe(true);
    expect(userAPath).not.toBe(userBPath);
  });

  it('rejects invalid user ids for database paths', () => {
    const userDataPath = createTrackedTempDirectory('clientdesk-user-data-');

    expect(() => getUserDatabasePath('../bad-user', userDataPath)).toThrow('Invalid user id');
  });

  it('creates schema_migrations and applies customer and sync migrations once', () => {
    const database = createMemoryDatabase();
    const migrationsDirectory = path.resolve('src/main/database/migrations');

    runMigrations(database, {
      migrationsDirectory,
      executedAt: () => '2026-06-21T00:00:00.000Z'
    });

    expect(tableExists(database, 'schema_migrations')).toBe(true);
    expect(tableExists(database, 'customers')).toBe(true);
    expect(tableExists(database, 'sync_outbox')).toBe(true);
    expect(tableExists(database, 'sync_cursors')).toBe(true);
    expect(tableExists(database, 'sync_conflicts')).toBe(true);
    expect(tableExists(database, 'app_metadata')).toBe(true);
    expect(customerColumns(database)).toEqual(
      expect.arrayContaining([
        'representative',
        'sync_status',
        'remote_version',
        'remote_updated_at',
        'deleted_at',
        'sync_conflict'
      ])
    );
    expect(indexNames(database)).toEqual(
      expect.arrayContaining([
        'idx_customers_legal_name',
        'idx_customers_trade_name',
        'idx_customers_email',
        'idx_customers_phone',
        'idx_customers_active',
        'idx_customers_sync_status',
        'idx_customers_remote_version',
        'idx_customers_deleted_at',
        'idx_customers_sync_conflict'
      ])
    );
    expect(migrationCount(database, 1)).toBe(1);
    expect(migrationCount(database, 2)).toBe(1);
    expect(migrationCount(database, 3)).toBe(1);
    expect(migrationCount(database, 4)).toBe(1);
    expect(migrationExecutedAt(database, 1)).toBe('2026-06-21T00:00:00.000Z');

    runMigrations(database, {
      migrationsDirectory,
      executedAt: () => '2026-06-22T00:00:00.000Z'
    });

    expect(migrationCount(database, 1)).toBe(1);
    expect(migrationCount(database, 2)).toBe(1);
    expect(migrationCount(database, 3)).toBe(1);
    expect(migrationCount(database, 4)).toBe(1);
    expect(migrationExecutedAt(database, 1)).toBe('2026-06-21T00:00:00.000Z');

    database.close();
  });

  it('rolls back a failed migration and does not mark it as executed', () => {
    const database = createMemoryDatabase();
    const migrationsDirectory = createTrackedTempDirectory('clientdesk-migrations-');

    writeFileSync(
      path.join(migrationsDirectory, '001-failing-migration.sql'),
      `
        CREATE TABLE rollback_probe (id TEXT PRIMARY KEY);
        INSERT INTO missing_table (id) VALUES ('broken');
      `
    );

    expect(() => runMigrations(database, { migrationsDirectory })).toThrow();
    expect(tableExists(database, 'schema_migrations')).toBe(true);
    expect(tableExists(database, 'rollback_probe')).toBe(false);
    expect(migrationCount(database, 1)).toBe(0);

    database.close();
  });
});

function createMemoryDatabase(): DatabaseConnection {
  const database = new Database(':memory:');
  configureDatabase(database);
  return database;
}

function customerColumns(database: DatabaseConnection): string[] {
  const rows = database.prepare('PRAGMA table_info(customers)').all() as TableColumnRow[];

  return rows.map((row) => row.name);
}

function createTrackedTempDirectory(prefix: string): string {
  const directory = createTempDirectory(prefix);
  tempDirectories.push(directory);
  return directory;
}

function tableExists(database: DatabaseConnection, tableName: string): boolean {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as SqliteNameRow | undefined;

  return row?.name === tableName;
}

function indexNames(database: DatabaseConnection): string[] {
  const rows = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'customers'")
    .all() as SqliteNameRow[];

  return rows.map((row) => row.name);
}

function migrationCount(database: DatabaseConnection, version: number): number {
  const row = database
    .prepare('SELECT COUNT(*) as count FROM schema_migrations WHERE version = ?')
    .get(version) as MigrationCountRow;

  return row.count;
}

function migrationExecutedAt(database: DatabaseConnection, version: number): string {
  const row = database
    .prepare('SELECT executed_at FROM schema_migrations WHERE version = ?')
    .get(version) as MigrationExecutedAtRow;

  return row.executed_at;
}
