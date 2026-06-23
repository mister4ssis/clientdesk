import type {
  BackupResult,
  BackupValidationResult,
  RestoreResult
} from '@shared/backup/backup.types';
import type { IpcResult } from '@shared/ipc/ipc-result';

export class ClientDeskBackupError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ClientDeskBackupError';
  }
}

export async function createBackup(): Promise<BackupResult> {
  return unwrapIpcResult(await window.clientDesk.backup.create());
}

export async function restoreBackup(): Promise<RestoreResult> {
  return unwrapIpcResult(await window.clientDesk.backup.restore());
}

export async function validateBackup(): Promise<BackupValidationResult> {
  return unwrapIpcResult(await window.clientDesk.backup.validate());
}

function unwrapIpcResult<TData>(result: IpcResult<TData>): TData {
  if (result.success) {
    return result.data;
  }

  throw new ClientDeskBackupError(result.error.code, result.error.message, result.error.details);
}
