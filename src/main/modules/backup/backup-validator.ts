import Database from 'better-sqlite3';
import { existsSync, realpathSync, statSync } from 'node:fs';
import type { BackupValidationResult } from '@shared/backup/backup.types';

interface BackupValidationOptions {
  activeDatabasePath?: string;
  allowActiveDatabase?: boolean;
  expectedOwnerUserId?: string;
  supportedVersion?: number;
}

interface SqliteMasterRow {
  name: string;
}

interface TableInfoRow {
  name: string;
}

interface MigrationRow {
  version: number;
  executed_at: string;
}

interface MetadataRow {
  value: string;
}

const currentSupportedMigrationVersion = 5;
const requiredCustomerColumns = [
  'id',
  'person_type',
  'legal_name',
  'active',
  'created_at',
  'updated_at'
];

export function validateBackupFile(
  filePath: string,
  options: BackupValidationOptions = {}
): BackupValidationResult {
  const supportedVersion = options.supportedVersion ?? currentSupportedMigrationVersion;

  if (!existsSync(filePath)) {
    return invalid('Arquivo inexistente.');
  }

  if (isEmptyFile(filePath)) {
    return invalid('Arquivo vazio.');
  }

  if (
    options.activeDatabasePath &&
    !options.allowActiveDatabase &&
    isSameFile(filePath, options.activeDatabasePath)
  ) {
    return invalid('O arquivo selecionado é o banco em uso.');
  }

  let database: Database.Database | null = null;

  try {
    database = new Database(filePath, {
      fileMustExist: true,
      readonly: true
    });

    const integrityResult = database.pragma('integrity_check', { simple: true });

    if (integrityResult !== 'ok') {
      return invalid('Falha na verificação de integridade.');
    }

    if (!tableExists(database, 'schema_migrations')) {
      return invalid('Tabela de migrations ausente.');
    }

    if (!tableExists(database, 'customers')) {
      return invalid('Tabela de clientes ausente.');
    }

    if (!hasRequiredCustomerColumns(database)) {
      return invalid('Colunas essenciais de clientes ausentes.');
    }

    if (
      options.expectedOwnerUserId &&
      getMetadataValue(database, 'owner_user_id') !== options.expectedOwnerUserId
    ) {
      return invalid('Backup pertence a outro usuário.');
    }

    const migrationInfo = getMigrationInfo(database);

    if (migrationInfo.version > supportedVersion) {
      return {
        valid: false,
        version: migrationInfo.version,
        createdAt: migrationInfo.createdAt,
        reason: 'Versão de migration futura.'
      };
    }

    return {
      valid: true,
      version: migrationInfo.version,
      createdAt: migrationInfo.createdAt
    };
  } catch {
    return invalid('Arquivo SQLite inválido.');
  } finally {
    database?.close();
  }
}

function getMetadataValue(database: Database.Database, key: string): string | null {
  if (!tableExists(database, 'app_metadata')) {
    return null;
  }

  const row = database
    .prepare('SELECT value FROM app_metadata WHERE key = ?')
    .get(key) as MetadataRow | undefined;

  return row?.value ?? null;
}

function invalid(reason: string): BackupValidationResult {
  return {
    valid: false,
    reason
  };
}

function isEmptyFile(filePath: string): boolean {
  return statSync(filePath).size === 0;
}

function isSameFile(leftPath: string, rightPath: string): boolean {
  try {
    return realpathSync(leftPath) === realpathSync(rightPath);
  } catch {
    return false;
  }
}

function tableExists(database: Database.Database, tableName: string): boolean {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as SqliteMasterRow | undefined;

  return row?.name === tableName;
}

function hasRequiredCustomerColumns(database: Database.Database): boolean {
  const rows = database.prepare('PRAGMA table_info(customers)').all() as TableInfoRow[];
  const columnNames = new Set(rows.map((row) => row.name));

  return requiredCustomerColumns.every((columnName) => columnNames.has(columnName));
}

function getMigrationInfo(database: Database.Database): {
  version: number;
  createdAt?: string;
} {
  const row = database
    .prepare(
      `
        SELECT version, executed_at
        FROM schema_migrations
        ORDER BY version DESC
        LIMIT 1
      `
    )
    .get() as MigrationRow | undefined;

  return {
    version: row?.version ?? 0,
    createdAt: row?.executed_at
  };
}
