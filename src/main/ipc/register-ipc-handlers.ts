import { app, ipcMain as electronIpcMain, type IpcMain, type IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { createIpcSuccess } from '@shared/ipc/ipc-result';
import type { IpcResult } from '@shared/ipc/ipc-result';
import {
  registerCustomerIpcHandlers,
  type CustomerServiceContract
} from '../modules/customers/customer.ipc';
import {
  registerBackupIpcHandlers,
  type BackupServiceContract
} from '../modules/backup/backup.ipc';
import { registerSyncIpcHandlers, type SyncServiceContract } from '../modules/sync/sync.ipc';

export type IpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>;

export interface RegisterIpcHandlersDependencies {
  customerService: CustomerServiceContract;
  backupService: BackupServiceContract;
  syncService?: SyncServiceContract;
  ipcMain?: IpcMainLike;
  getAppVersion?: () => string;
}

export function registerIpcHandlers({
  customerService,
  backupService,
  syncService,
  ipcMain = electronIpcMain,
  getAppVersion = () => app.getVersion()
}: RegisterIpcHandlersDependencies): void {
  replaceIpcHandler(ipcMain, IPC_CHANNELS.app.getVersion, () =>
    createIpcSuccess<string>(getAppVersion())
  );

  registerCustomerIpcHandlers({
    ipcMain,
    customerService
  });

  registerBackupIpcHandlers({
    ipcMain,
    backupService
  });

  if (syncService) {
    registerSyncIpcHandlers({
      ipcMain,
      syncService
    });
  }
}

type AppVersionHandler = (event: IpcMainInvokeEvent) => IpcResult<string>;

function replaceIpcHandler(ipcMain: IpcMainLike, channel: string, handler: AppVersionHandler): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}
