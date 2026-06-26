import { app, ipcMain as electronIpcMain, type IpcMain, type IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { createIpcHandler } from './ipc-error-handler';
import { registerAuthIpcHandlers, type AuthServiceContract } from '../modules/auth/auth.ipc';
import {
  registerCustomerIpcHandlers,
  type CustomerServiceContract
} from '../modules/customers/customer.ipc';
import {
  registerBackupIpcHandlers,
  type BackupServiceContract
} from '../modules/backup/backup.ipc';
import {
  registerSyncIpcHandlers,
  type CustomerConflictServiceContract,
  type SyncServiceContract
} from '../modules/sync/sync.ipc';

export type IpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>;

export interface RegisterIpcHandlersDependencies {
  authService?: AuthServiceContract;
  customerService?: CustomerServiceContract;
  backupService?: BackupServiceContract;
  syncService?: SyncServiceContract;
  customerConflictService?: CustomerConflictServiceContract;
  ipcMain?: IpcMainLike;
  getAppVersion?: () => string;
}

export function registerIpcHandlers({
  authService,
  customerService,
  backupService,
  syncService,
  customerConflictService,
  ipcMain = electronIpcMain,
  getAppVersion = () => app.getVersion()
}: RegisterIpcHandlersDependencies): void {
  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.app.getVersion,
    createIpcHandler<string>(IPC_CHANNELS.app.getVersion, () => getAppVersion())
  );

  if (authService) {
    registerAuthIpcHandlers({
      ipcMain,
      authService
    });
  }

  if (customerService) {
    registerCustomerIpcHandlers({
      ipcMain,
      customerService
    });
  }

  if (backupService) {
    registerBackupIpcHandlers({
      ipcMain,
      backupService
    });
  }

  if (syncService) {
    registerSyncIpcHandlers({
      ipcMain,
      syncService,
      customerConflictService
    });
  }
}

type AppVersionHandler = (event: IpcMainInvokeEvent) => Promise<unknown>;

function replaceIpcHandler(ipcMain: IpcMainLike, channel: string, handler: AppVersionHandler): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}
