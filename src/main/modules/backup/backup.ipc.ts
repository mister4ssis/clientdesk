import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type {
  BackupResult,
  BackupValidationResult,
  RestoreResult
} from '@shared/backup/backup.types';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { createIpcSuccess, type IpcResult } from '@shared/ipc/ipc-result';
import { toIpcFailure } from '../../ipc/ipc-error-handler';
import type { BackupService } from './backup.service';

type IpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>;
export type BackupServiceContract = Pick<
  BackupService,
  'createBackup' | 'restoreBackup' | 'validateBackup'
>;

interface RegisterBackupIpcHandlersDependencies {
  ipcMain: IpcMainLike;
  backupService: BackupServiceContract;
}

export function registerBackupIpcHandlers({
  ipcMain,
  backupService
}: RegisterBackupIpcHandlersDependencies): void {
  replaceIpcHandler(ipcMain, IPC_CHANNELS.backup.create, async () => {
    try {
      return createIpcSuccess<BackupResult>(await backupService.createBackup());
    } catch (error) {
      return toIpcFailure(error);
    }
  });

  replaceIpcHandler(ipcMain, IPC_CHANNELS.backup.restore, async () => {
    try {
      return createIpcSuccess<RestoreResult>(await backupService.restoreBackup());
    } catch (error) {
      return toIpcFailure(error);
    }
  });

  replaceIpcHandler(ipcMain, IPC_CHANNELS.backup.validate, async () => {
    try {
      return createIpcSuccess<BackupValidationResult>(await backupService.validateBackup());
    } catch (error) {
      return toIpcFailure(error);
    }
  });
}

type IpcHandler = (
  event: IpcMainInvokeEvent,
  input?: unknown
) => Promise<IpcResult<BackupResult | RestoreResult | BackupValidationResult>>;

function replaceIpcHandler(ipcMain: IpcMainLike, channel: string, handler: IpcHandler): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}
