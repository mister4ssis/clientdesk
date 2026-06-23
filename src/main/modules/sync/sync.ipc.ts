import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type { SyncRunResult, SyncStatus } from '@shared/sync/sync.types';
import type { IpcResult } from '@shared/ipc/ipc-result';
import { createIpcSuccess } from '@shared/ipc/ipc-result';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { toIpcFailure } from '../../ipc/ipc-error-handler';
import type { BackgroundSyncService } from './background-sync.service';

type IpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>;
export type SyncServiceContract = Pick<BackgroundSyncService, 'getStatus' | 'runNow'>;

interface RegisterSyncIpcHandlersDependencies {
  ipcMain: IpcMainLike;
  syncService: SyncServiceContract;
}

export function registerSyncIpcHandlers({
  ipcMain,
  syncService
}: RegisterSyncIpcHandlersDependencies): void {
  replaceIpcHandler(ipcMain, IPC_CHANNELS.sync.getStatus, () => {
    try {
      return createIpcSuccess<SyncStatus>(syncService.getStatus());
    } catch (error) {
      return toIpcFailure(error);
    }
  });

  replaceIpcHandler(ipcMain, IPC_CHANNELS.sync.runNow, async () => {
    try {
      return createIpcSuccess<SyncRunResult>(await syncService.runNow());
    } catch (error) {
      return toIpcFailure(error);
    }
  });
}

type IpcHandler = (
  event: IpcMainInvokeEvent,
  input?: unknown
) => IpcResult<SyncStatus | SyncRunResult> | Promise<IpcResult<SyncStatus | SyncRunResult>>;

function replaceIpcHandler(ipcMain: IpcMainLike, channel: string, handler: IpcHandler): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}
