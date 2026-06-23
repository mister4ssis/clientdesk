import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configureDatabase, type DatabaseConnection } from '@main/database/database';
import { runMigrations } from '@main/database/migration-runner';
import { validateBackupFile } from '@main/modules/backup/backup-validator';
import { createTempDirectory, removeTempDirectory } from '../../helpers/temp-directory';

let tempDirectory: string;

beforeEach(() => {
  tempDirectory = createTempDirectory('clientdesk-backup-validator-');
});

afterEach(() => {
  removeTempDirectory(tempDirectory);
});

describe('validateBackupFile', () => {
  it('accepts a valid SQLite backup', () => {
    const filePath = createValidDatabase('valid.sqlite');

    expect(validateBackupFile(filePath)).toMatchObject({
      valid: true,
      version: 2
    });
  });

  it('rejects a missing file', () => {
    expect(validateBackupFile(path.join(tempDirectory, 'missing.sqlite'))).toMatchObject({
      valid: false
    });
  });

  it('rejects an empty file', () => {
    const filePath = path.join(tempDirectory, 'empty.sqlite');
    writeFileSync(filePath, '');

    expect(validateBackupFile(filePath)).toMatchObject({
      valid: false,
      reason: 'Arquivo vazio.'
    });
  });

  it('rejects a non-SQLite file', () => {
    const filePath = path.join(tempDirectory, 'text.sqlite');
    writeFileSync(filePath, 'not a sqlite database');

    expect(validateBackupFile(filePath)).toMatchObject({
      valid: false
    });
  });

  it('rejects a database without schema_migrations', () => {
    const filePath = path.join(tempDirectory, 'no-migrations.sqlite');
    const database = new Database(filePath);
    database.exec('CREATE TABLE customers (id TEXT PRIMARY KEY)');
    database.close();

    expect(validateBackupFile(filePath)).toMatchObject({
      valid: false,
      reason: 'Tabela de migrations ausente.'
    });
  });

  it('rejects a database without customers', () => {
    const filePath = path.join(tempDirectory, 'no-customers.sqlite');
    const database = new Database(filePath);
    database.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TEXT NOT NULL
      );
    `);
    database.close();

    expect(validateBackupFile(filePath)).toMatchObject({
      valid: false,
      reason: 'Tabela de clientes ausente.'
    });
  });

  it('rejects a database with missing customer columns', () => {
    const filePath = path.join(tempDirectory, 'missing-columns.sqlite');
    const database = new Database(filePath);
    database.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TEXT NOT NULL
      );
      INSERT INTO schema_migrations (version, name, executed_at)
      VALUES (1, 'create-customers', '2026-06-22T00:00:00.000Z');
      CREATE TABLE customers (id TEXT PRIMARY KEY);
    `);
    database.close();

    expect(validateBackupFile(filePath)).toMatchObject({
      valid: false,
      reason: 'Colunas essenciais de clientes ausentes.'
    });
  });

  it('accepts an older compatible migration version', () => {
    const filePath = createValidDatabase('old.sqlite');
    const database = new Database(filePath);
    database.exec(`
      DELETE FROM schema_migrations;
      INSERT INTO schema_migrations (version, name, executed_at)
      VALUES (0, 'legacy', '2026-06-22T00:00:00.000Z');
    `);
    database.close();

    expect(validateBackupFile(filePath)).toMatchObject({
      valid: true,
      version: 0
    });
  });

  it('rejects a future incompatible migration version', () => {
    const filePath = createValidDatabase('future.sqlite');
    const database = new Database(filePath);
    database.exec(`
      DELETE FROM schema_migrations;
      INSERT INTO schema_migrations (version, name, executed_at)
      VALUES (999, 'future', '2026-06-22T00:00:00.000Z');
    `);
    database.close();

    expect(validateBackupFile(filePath)).toMatchObject({
      valid: false,
      version: 999,
      reason: 'Versão de migration futura.'
    });
  });

  it('rejects the active database path', () => {
    const filePath = createValidDatabase('active.sqlite');

    expect(validateBackupFile(filePath, { activeDatabasePath: filePath })).toMatchObject({
      valid: false,
      reason: 'O arquivo selecionado é o banco em uso.'
    });
  });
});

function createValidDatabase(fileName: string): string {
  mkdirSync(tempDirectory, { recursive: true });
  const filePath = path.join(tempDirectory, fileName);
  const database = new Database(filePath);
  migrate(database);
  database.close();

  return filePath;
}

function migrate(database: DatabaseConnection): void {
  configureDatabase(database);
  runMigrations(database, {
    migrationsDirectory: path.resolve('src/main/database/migrations'),
    executedAt: () => '2026-06-22T00:00:00.000Z'
  });
}
