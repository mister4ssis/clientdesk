import { useState } from 'react';
import { PageHeader } from '@renderer/components/layout/PageHeader';
import {
  ClientDeskBackupError,
  createBackup,
  restoreBackup,
  validateBackup
} from '@renderer/services/backup-client';
import type {
  BackupResult,
  BackupValidationResult,
  RestoreResult
} from '@shared/backup/backup.types';
import { BackupSection } from './components/BackupSection';
import { RestoreSection } from './components/RestoreSection';
import { SyncSection } from './components/SyncSection';

interface BackupSettingsPageProps {
  onRestoreCompleted: () => void;
  onViewSyncConflicts: () => void;
}

type Operation = 'backup' | 'restore' | 'validate' | null;

export function BackupSettingsPage({
  onRestoreCompleted,
  onViewSyncConflicts
}: BackupSettingsPageProps) {
  const [operation, setOperation] = useState<Operation>(null);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const isProcessing = operation !== null;

  async function handleCreateBackup(): Promise<void> {
    setOperation('backup');
    setBackupError(null);
    setBackupResult(null);

    try {
      setBackupResult(await createBackup());
    } catch (error) {
      setBackupError(getBackupErrorMessage(error));
    } finally {
      setOperation(null);
    }
  }

  async function handleValidateBackup(): Promise<void> {
    setOperation('validate');
    setRestoreError(null);
    setValidationResult(null);

    try {
      setValidationResult(await validateBackup());
    } catch (error) {
      setRestoreError(getRestoreErrorMessage(error));
    } finally {
      setOperation(null);
    }
  }

  async function handleRestoreBackup(): Promise<void> {
    setOperation('restore');
    setRestoreError(null);
    setRestoreResult(null);

    try {
      const result = await restoreBackup();
      setRestoreResult(result);
      setConfirmRestoreOpen(false);

      if (result.success) {
        onRestoreCompleted();
      }
    } catch (error) {
      setRestoreError(getRestoreErrorMessage(error));
    } finally {
      setOperation(null);
    }
  }

  return (
    <section className="settings-page" aria-labelledby="backup-settings-title">
      <PageHeader
        title="Backup e restauração"
        subtitle="Crie uma cópia local dos dados ou restaure um backup validado."
        titleId="backup-settings-title"
      />

      <BackupSection
        isProcessing={isProcessing}
        result={backupResult}
        errorMessage={backupError}
        onCreateBackup={() => void handleCreateBackup()}
      />

      <RestoreSection
        isProcessing={isProcessing}
        restoreResult={restoreResult}
        validationResult={validationResult}
        errorMessage={restoreError}
        confirmRestoreOpen={confirmRestoreOpen}
        onOpenRestoreConfirmation={() => setConfirmRestoreOpen(true)}
        onCancelRestoreConfirmation={() => setConfirmRestoreOpen(false)}
        onConfirmRestore={() => void handleRestoreBackup()}
        onValidateBackup={() => void handleValidateBackup()}
      />

      <SyncSection onViewConflicts={onViewSyncConflicts} />
    </section>
  );
}

function getBackupErrorMessage(error: unknown): string {
  if (error instanceof ClientDeskBackupError) {
    switch (error.code) {
      case 'BACKUP_OPERATION_IN_PROGRESS':
        return 'Já existe uma operação de backup ou restauração em andamento.';
      case 'BACKUP_CANCELLED':
        return '';
      default:
        return 'Não foi possível criar o backup.';
    }
  }

  return 'Ocorreu um erro inesperado ao criar o backup.';
}

function getRestoreErrorMessage(error: unknown): string {
  if (error instanceof ClientDeskBackupError) {
    switch (error.code) {
      case 'BACKUP_INVALID_FILE':
        return 'O arquivo selecionado não é um backup válido do ClientDesk.';
      case 'BACKUP_INCOMPATIBLE_VERSION':
        return 'O backup foi criado por uma versão incompatível do ClientDesk.';
      case 'BACKUP_OPERATION_IN_PROGRESS':
        return 'Já existe uma operação de backup ou restauração em andamento.';
      case 'BACKUP_CANCELLED':
        return '';
      default:
        return 'Não foi possível restaurar o backup.';
    }
  }

  return 'Ocorreu um erro inesperado ao restaurar o backup.';
}
