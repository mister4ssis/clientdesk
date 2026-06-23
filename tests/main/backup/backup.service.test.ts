import Database from 'better-sqlite3';
import { dirname } from 'node:path';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureDatabase, type DatabaseConnection } from '@main/database/database';
import { runMigrations } from '@main/database/migration-runner';
import { ApplicationError } from '@main/errors/application-error';
import { ErrorCode } from '@main/errors/error-codes';
import { BackupService } from '@main/modules/backup/backup.service';
import { validateBackupFile } from '@main/modules/backup/backup-validator';
import { CustomerRepository } from '@main/modules/customers/customer.repository';
import type { Customer } from '@shared/customers/customer.types';
import { createTempDirectory, removeTempDirectory } from '../../helpers/temp-directory';
import { activeCustomerFixture, inactiveCustomerFixture } from '../../fixtures/customer-fixtures';

let tempDirectory: string;
let userDataPath: string;
let databasePath: string;
let database: DatabaseConnection | null;
let saveDialogPath: string | null;
let openDialogPath: string | null;
let migrateShouldFail: boolean;
let restoredCount: number;

beforeEach(() => {
  tempDirectory = createTempDirectory('clientdesk-backup-service-');
  userDataPath = path.join(tempDirectory, 'user-data');
  databasePath = path.join(userDataPath, 'data', 'clientdesk.sqlite');
  database = openMigratedDatabase(databasePath);
  saveDialogPath = null;
  openDialogPath = null;
  migrateShouldFail = false;
  restoredCount = 0;
});

afterEach(() => {
  database?.close();
  database = null;
  removeTempDirectory(tempDirectory);
});

describe('BackupService', () => {
  it('creates and validates a backup', async () => {
    createCustomer(activeCustomerFixture);
    saveDialogPath = path.join(tempDirectory, 'backup.sqlite');

    const service = createService();
    const result = await service.createBackup();

    expect(result).toMatchObject({
      success: true,
      fileName: 'backup.sqlite'
    });
    expect(service.getLastBackup()?.fileName).toBe('backup.sqlite');
    expect(existsSync(saveDialogPath)).toBe(true);
  });

  it('cancels backup creation without error', async () => {
    saveDialogPath = null;

    await expect(createService().createBackup()).resolves.toEqual({ success: false });
  });

  it('rejects backup creation failures', async () => {
    saveDialogPath = path.join(tempDirectory, 'missing', 'backup.sqlite');

    await expectApplicationErrorCode(
      () => createService().createBackup(),
      ErrorCode.BackupCreateFailed
    );
  });

  it('restores a valid backup and reopens the connection', async () => {
    createCustomer(activeCustomerFixture);
    const backupPath = path.join(tempDirectory, 'restore-source.sqlite');
    await currentDatabase().backup(backupPath);
    createCustomer(inactiveCustomerFixture);
    openDialogPath = backupPath;

    const result = await createService().restoreBackup();

    expect(result.success).toBe(true);
    expect(restoredCount).toBe(1);
    expect(currentRepository().list().items.map((customer) => customer.id)).toEqual([
      activeCustomerFixture.id
    ]);
  });

  it('cancels restoration without error', async () => {
    openDialogPath = null;

    await expect(createService().restoreBackup()).resolves.toEqual({ success: false });
  });

  it('rejects invalid backup files', async () => {
    const invalidPath = path.join(tempDirectory, 'invalid.sqlite');
    writeFileSync(invalidPath, 'not sqlite');
    openDialogPath = invalidPath;

    await expectApplicationErrorCode(
      () => createService().restoreBackup(),
      ErrorCode.BackupInvalidFile
    );
  });

  it('rejects incompatible backup versions', async () => {
    const futurePath = path.join(tempDirectory, 'future.sqlite');
    const futureDatabase = openMigratedDatabase(futurePath);
    futureDatabase.exec('UPDATE schema_migrations SET version = 999');
    futureDatabase.close();
    openDialogPath = futurePath;

    await expectApplicationErrorCode(
      () => createService().restoreBackup(),
      ErrorCode.BackupIncompatibleVersion
    );
  });

  it('creates an automatic safety backup before restoration', async () => {
    createCustomer(activeCustomerFixture);
    const backupPath = path.join(tempDirectory, 'source.sqlite');
    await currentDatabase().backup(backupPath);
    openDialogPath = backupPath;

    await createService().restoreBackup();

    const backupDirectory = path.join(userDataPath, 'backups');
    expect(readdirSync(backupDirectory).some((fileName) => fileName.startsWith('before-restore-'))).toBe(
      true
    );
  });

  it('recovers the previous database when post-copy validation fails', async () => {
    createCustomer(activeCustomerFixture);
    const backupPath = path.join(tempDirectory, 'source.sqlite');
    await currentDatabase().backup(backupPath);
    createCustomer(inactiveCustomerFixture);
    openDialogPath = backupPath;

    let validationCalls = 0;
    const service = createService({
      validateFile: (filePath, options) => {
        validationCalls += 1;
        if (validationCalls === 2) {
          return { valid: false, reason: 'forced failure' };
        }

        return validateBackupFile(filePath, options);
      }
    });

    await expectApplicationErrorCode(() => service.restoreBackup(), ErrorCode.BackupRestoreFailed);
    expect(currentRepository().findById(inactiveCustomerFixture.id)).not.toBeNull();
    expect(currentDatabase().open).toBe(true);
  });

  it('prevents simultaneous operations', async () => {
    let resolveSaveDialog: (value: { canceled: boolean; filePath?: string }) => void =
      () => undefined;
    const service = createService({
      dialog: {
        showSaveDialog: () =>
          new Promise((resolve) => {
            resolveSaveDialog = resolve;
          }),
        showOpenDialog: async () => ({
          canceled: true,
          filePaths: []
        })
      }
    });

    const firstOperation = service.createBackup();
    await expectApplicationErrorCode(
      () => service.createBackup(),
      ErrorCode.BackupOperationInProgress
    );

    resolveSaveDialog({ canceled: true });
    await firstOperation;
  });
});

function createService(overrides: Partial<ConstructorParameters<typeof BackupService>[0]> = {}) {
  return new BackupService({
    dialog: createDialogMock(),
    getCurrentDatabase: currentDatabase,
    closeCurrentDatabase: closeCurrentDatabase,
    openCurrentDatabase: openCurrentDatabase,
    migrateDatabase: migrateDatabase,
    getCurrentDatabasePath: () => databasePath,
    getUserDataPath: () => userDataPath,
    now: () => new Date('2026-06-22T10:30:00.000Z'),
    onDatabaseRestored: () => {
      restoredCount += 1;
    },
    ...overrides
  });
}

function createDialogMock() {
  return {
    showSaveDialog: vi.fn(async () =>
      saveDialogPath ? { canceled: false, filePath: saveDialogPath } : { canceled: true }
    ),
    showOpenDialog: vi.fn(async () =>
      openDialogPath
        ? { canceled: false, filePaths: [openDialogPath] }
        : { canceled: true, filePaths: [] }
    )
  };
}

function openMigratedDatabase(filePath: string): DatabaseConnection {
  mkdirSync(dirname(filePath), { recursive: true });
  const connection = new Database(filePath);
  migrateDatabase(connection);

  return connection;
}

function migrateDatabase(connection: DatabaseConnection): void {
  if (migrateShouldFail) {
    migrateShouldFail = false;
    throw new Error('migration failure');
  }

  configureDatabase(connection);
  runMigrations(connection, {
    migrationsDirectory: path.resolve('src/main/database/migrations'),
    executedAt: () => '2026-06-22T00:00:00.000Z'
  });
}

function currentDatabase(): DatabaseConnection {
  if (!database?.open) {
    throw new Error('Expected an open database.');
  }

  return database;
}

function closeCurrentDatabase(): void {
  database?.close();
  database = null;
}

function openCurrentDatabase(): DatabaseConnection {
  database = openMigratedDatabase(databasePath);

  return database;
}

function currentRepository(): CustomerRepository {
  return new CustomerRepository(currentDatabase());
}

function createCustomer(customer: Customer): void {
  currentRepository().create(customer);
}

async function expectApplicationErrorCode(
  operation: () => Promise<unknown>,
  expectedCode: ErrorCode
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    expect(error).toBeInstanceOf(ApplicationError);
    expect((error as ApplicationError).code).toBe(expectedCode);
    return;
  }

  throw new Error(`Expected ApplicationError with code ${expectedCode}.`);
}
