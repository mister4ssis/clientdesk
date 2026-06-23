import { dialog } from 'electron';
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { DatabaseConnection } from '../../database/database';
import { closeDatabase, getDatabase, openDatabase } from '../../database/database';
import { getDatabasePath } from '../../database/database-path';
import { runMigrations } from '../../database/migration-runner';
import { ApplicationError } from '../../errors/application-error';
import { ErrorCode } from '../../errors/error-codes';
import {
  createBackupFileName,
  createBeforeRestoreBackupFileName,
  getAutomaticBackupDirectory
} from './backup-path';
import { validateBackupFile } from './backup-validator';
import type {
  BackupResult,
  BackupValidationResult,
  RestoreResult
} from '@shared/backup/backup.types';

interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

interface BackupDialog {
  showSaveDialog(options: Electron.SaveDialogOptions): Promise<SaveDialogResult>;
  showOpenDialog(options: Electron.OpenDialogOptions): Promise<OpenDialogResult>;
}

interface BackupServiceDependencies {
  dialog?: BackupDialog;
  getCurrentDatabase?: () => DatabaseConnection;
  closeCurrentDatabase?: () => void;
  openCurrentDatabase?: () => DatabaseConnection;
  migrateDatabase?: (database: DatabaseConnection) => void;
  getCurrentDatabasePath?: () => string;
  getUserDataPath: () => string;
  now?: () => Date;
  validateFile?: typeof validateBackupFile;
  onDatabaseRestored?: (database: DatabaseConnection) => void;
}

export class BackupService {
  private operationInProgress = false;
  private lastBackup: BackupResult | null = null;
  private readonly dialog: BackupDialog;
  private readonly getCurrentDatabase: () => DatabaseConnection;
  private readonly closeCurrentDatabase: () => void;
  private readonly openCurrentDatabase: () => DatabaseConnection;
  private readonly migrateDatabase: (database: DatabaseConnection) => void;
  private readonly getCurrentDatabasePath: () => string;
  private readonly getUserDataPath: () => string;
  private readonly now: () => Date;
  private readonly validateFile: typeof validateBackupFile;
  private readonly onDatabaseRestored?: (database: DatabaseConnection) => void;

  constructor(dependencies: BackupServiceDependencies) {
    this.dialog = dependencies.dialog ?? dialog;
    this.getCurrentDatabase = dependencies.getCurrentDatabase ?? getDatabase;
    this.closeCurrentDatabase = dependencies.closeCurrentDatabase ?? closeDatabase;
    this.openCurrentDatabase = dependencies.openCurrentDatabase ?? openDatabase;
    this.migrateDatabase = dependencies.migrateDatabase ?? runMigrations;
    this.getCurrentDatabasePath = dependencies.getCurrentDatabasePath ?? getDatabasePath;
    this.getUserDataPath = dependencies.getUserDataPath;
    this.now = dependencies.now ?? (() => new Date());
    this.validateFile = dependencies.validateFile ?? validateBackupFile;
    this.onDatabaseRestored = dependencies.onDatabaseRestored;
  }

  getLastBackup(): BackupResult | null {
    return this.lastBackup;
  }

  async createBackup(): Promise<BackupResult> {
    return this.runExclusive(async () => {
      const selectedPath = await this.selectBackupDestination();

      if (!selectedPath) {
        return { success: false };
      }

      try {
        const database = this.getCurrentDatabase();
        await database.backup(selectedPath);

        const validation = this.validateFile(selectedPath, {
          activeDatabasePath: this.getCurrentDatabasePath()
        });

        if (!validation.valid) {
          throw new ApplicationError(ErrorCode.BackupCreateFailed, 'Backup gerado inválido.');
        }

        const result = {
          success: true,
          fileName: path.basename(selectedPath),
          createdAt: this.now().toISOString()
        };
        this.lastBackup = result;

        return result;
      } catch (error) {
        if (error instanceof ApplicationError) {
          throw error;
        }

        throw new ApplicationError(ErrorCode.BackupCreateFailed, 'Falha ao criar backup.', {
          cause: error
        });
      }
    });
  }

  async validateBackup(): Promise<BackupValidationResult> {
    return this.runExclusive(async () => {
      const selectedPath = await this.selectBackupFile();

      if (!selectedPath) {
        return {
          valid: false,
          reason: 'Operação cancelada.'
        };
      }

      return this.validateFile(selectedPath, {
        activeDatabasePath: this.getCurrentDatabasePath()
      });
    });
  }

  async restoreBackup(): Promise<RestoreResult> {
    return this.runExclusive(async () => {
      const selectedPath = await this.selectBackupFile();

      if (!selectedPath) {
        return { success: false };
      }

      const validation = this.validateFile(selectedPath, {
        activeDatabasePath: this.getCurrentDatabasePath()
      });

      if (!validation.valid) {
        throw validation.version !== undefined && validation.version > 1
          ? new ApplicationError(ErrorCode.BackupIncompatibleVersion, 'Backup incompatível.')
          : new ApplicationError(ErrorCode.BackupInvalidFile, 'Backup inválido.');
      }

      const databasePath = this.getCurrentDatabasePath();
      const safetyBackupPath = await this.createBeforeRestoreBackup();

      try {
        this.closeCurrentDatabase();
        copyFileSync(selectedPath, databasePath);

        const restoredDatabase = this.openCurrentDatabase();
        this.migrateDatabase(restoredDatabase);

        const restoredValidation = this.validateFile(databasePath, {
          allowActiveDatabase: true
        });

        if (!restoredValidation.valid) {
          throw new ApplicationError(ErrorCode.BackupRestoreFailed, 'Banco restaurado inválido.');
        }

        this.onDatabaseRestored?.(restoredDatabase);

        return {
          success: true,
          restoredAt: this.now().toISOString()
        };
      } catch (error) {
        this.restoreSafetyBackup(databasePath, safetyBackupPath);

        if (error instanceof ApplicationError) {
          throw error;
        }

        throw new ApplicationError(ErrorCode.BackupRestoreFailed, 'Falha ao restaurar backup.', {
          cause: error
        });
      }
    });
  }

  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.operationInProgress) {
      throw new ApplicationError(
        ErrorCode.BackupOperationInProgress,
        'Operação de backup em andamento.'
      );
    }

    this.operationInProgress = true;

    try {
      return await operation();
    } finally {
      this.operationInProgress = false;
    }
  }

  private async selectBackupDestination(): Promise<string | null> {
    const result = await this.dialog.showSaveDialog({
      title: 'Salvar backup do ClientDesk',
      defaultPath: createBackupFileName(this.now()),
      filters: backupFileFilters
    });

    return result.canceled ? null : result.filePath ?? null;
  }

  private async selectBackupFile(): Promise<string | null> {
    const result = await this.dialog.showOpenDialog({
      title: 'Selecionar backup do ClientDesk',
      properties: ['openFile'],
      filters: backupFileFilters
    });

    return result.canceled ? null : result.filePaths[0] ?? null;
  }

  private async createBeforeRestoreBackup(): Promise<string> {
    const backupDirectory = getAutomaticBackupDirectory(this.getUserDataPath());
    mkdirSync(backupDirectory, { recursive: true });

    const backupPath = path.join(
      backupDirectory,
      createBeforeRestoreBackupFileName(this.now())
    );

    try {
      await this.getCurrentDatabase().backup(backupPath);
      return backupPath;
    } catch (error) {
      throw new ApplicationError(
        ErrorCode.BackupRestoreFailed,
        'Falha ao criar backup de segurança antes da restauração.',
        { cause: error }
      );
    }
  }

  private restoreSafetyBackup(databasePath: string, safetyBackupPath: string): void {
    try {
      this.closeCurrentDatabase();
      copyFileSync(safetyBackupPath, databasePath);
      const recoveredDatabase = this.openCurrentDatabase();
      this.migrateDatabase(recoveredDatabase);
      this.onDatabaseRestored?.(recoveredDatabase);
    } catch (error) {
      throw new ApplicationError(
        ErrorCode.BackupRestoreFailed,
        'Falha ao recuperar banco anterior após erro de restauração.',
        { cause: error }
      );
    }
  }
}

const backupFileFilters = [
  {
    name: 'Backups do ClientDesk',
    extensions: ['sqlite', 'clientdesk-backup']
  }
];
