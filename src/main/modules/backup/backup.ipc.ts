import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type {
  BackupResult,
  BackupValidationResult,
  RestoreResult
} from '@shared/backup/backup.types';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { createIpcHandler } from '../../ipc/ipc-error-handler';
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
  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.backup.create,
    createIpcHandler<BackupResult>(IPC_CHANNELS.backup.create, () =>
      backupService.createBackup()
    )
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.backup.restore,
    createIpcHandler<RestoreResult>(IPC_CHANNELS.backup.restore, () =>
      backupService.restoreBackup()
    )
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.backup.validate,
    createIpcHandler<BackupValidationResult>(IPC_CHANNELS.backup.validate, () =>
      backupService.validateBackup()
    )
  );
}

type IpcHandler = (
  event: IpcMainInvokeEvent,
  input?: unknown
) => Promise<unknown>;

function replaceIpcHandler(ipcMain: IpcMainLike, channel: string, handler: IpcHandler): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}
