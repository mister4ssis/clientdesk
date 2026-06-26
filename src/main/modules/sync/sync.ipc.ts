import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type { SyncRunResult, SyncStatus } from '@shared/sync/sync.types';
import type { SyncConflictDetails, SyncConflictSummary } from '@shared/sync/sync.types';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { createIpcHandler } from '../../ipc/ipc-error-handler';
import type { BackgroundSyncService } from './background-sync.service';
import type { CustomerConflictService } from './customer-conflict.service';
import { z } from 'zod';

type IpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>;
export type SyncServiceContract = Pick<BackgroundSyncService, 'getStatus' | 'runNow'>;
export type CustomerConflictServiceContract = Pick<
  CustomerConflictService,
  'listConflicts' | 'getConflict' | 'resolveKeepLocal' | 'resolveUseRemote'
>;

interface RegisterSyncIpcHandlersDependencies {
  ipcMain: IpcMainLike;
  syncService: SyncServiceContract;
  customerConflictService?: CustomerConflictServiceContract;
}

const conflictIdInputSchema = z.object({
  id: z.string().uuid()
});

export function registerSyncIpcHandlers({
  ipcMain,
  syncService,
  customerConflictService
}: RegisterSyncIpcHandlersDependencies): void {
  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.sync.getStatus,
    createIpcHandler<SyncStatus>(IPC_CHANNELS.sync.getStatus, () => syncService.getStatus())
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.sync.runNow,
    createIpcHandler<SyncRunResult>(IPC_CHANNELS.sync.runNow, () => syncService.runNow())
  );

  if (!customerConflictService) {
    return;
  }

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.sync.listConflicts,
    createIpcHandler<SyncConflictSummary[]>(IPC_CHANNELS.sync.listConflicts, () =>
      customerConflictService.listConflicts()
    )
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.sync.getConflict,
    createIpcHandler<SyncConflictDetails>(
      IPC_CHANNELS.sync.getConflict,
      (_event, input: unknown) => {
        const parsedInput = conflictIdInputSchema.parse(input);

        return customerConflictService.getConflict(parsedInput.id);
      }
    )
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.sync.resolveKeepLocal,
    createIpcHandler<SyncConflictDetails>(
      IPC_CHANNELS.sync.resolveKeepLocal,
      async (_event, input: unknown) => {
        const parsedInput = conflictIdInputSchema.parse(input);

        return customerConflictService.resolveKeepLocal(parsedInput.id);
      }
    )
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.sync.resolveUseRemote,
    createIpcHandler<SyncConflictDetails>(
      IPC_CHANNELS.sync.resolveUseRemote,
      (_event, input: unknown) => {
        const parsedInput = conflictIdInputSchema.parse(input);

        return customerConflictService.resolveUseRemote(parsedInput.id);
      }
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
