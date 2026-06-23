import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type { SyncRunResult, SyncStatus } from '@shared/sync/sync.types';
import type { SyncConflictDetails, SyncConflictSummary } from '@shared/sync/sync.types';
import type { IpcResult } from '@shared/ipc/ipc-result';
import { createIpcSuccess } from '@shared/ipc/ipc-result';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { toIpcFailure } from '../../ipc/ipc-error-handler';
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

  if (!customerConflictService) {
    return;
  }

  replaceIpcHandler(ipcMain, IPC_CHANNELS.sync.listConflicts, () => {
    try {
      return createIpcSuccess<SyncConflictSummary[]>(
        customerConflictService.listConflicts()
      );
    } catch (error) {
      return toIpcFailure(error);
    }
  });

  replaceIpcHandler(ipcMain, IPC_CHANNELS.sync.getConflict, (_event, input: unknown) => {
    try {
      const parsedInput = conflictIdInputSchema.parse(input);

      return createIpcSuccess<SyncConflictDetails>(
        customerConflictService.getConflict(parsedInput.id)
      );
    } catch (error) {
      return toIpcFailure(error);
    }
  });

  replaceIpcHandler(ipcMain, IPC_CHANNELS.sync.resolveKeepLocal, async (_event, input: unknown) => {
    try {
      const parsedInput = conflictIdInputSchema.parse(input);

      return createIpcSuccess<SyncConflictDetails>(
        await customerConflictService.resolveKeepLocal(parsedInput.id)
      );
    } catch (error) {
      return toIpcFailure(error);
    }
  });

  replaceIpcHandler(ipcMain, IPC_CHANNELS.sync.resolveUseRemote, (_event, input: unknown) => {
    try {
      const parsedInput = conflictIdInputSchema.parse(input);

      return createIpcSuccess<SyncConflictDetails>(
        customerConflictService.resolveUseRemote(parsedInput.id)
      );
    } catch (error) {
      return toIpcFailure(error);
    }
  });
}

type IpcHandler = (
  event: IpcMainInvokeEvent,
  input?: unknown
) =>
  | IpcResult<SyncStatus | SyncRunResult | SyncConflictSummary[] | SyncConflictDetails>
  | Promise<IpcResult<SyncStatus | SyncRunResult | SyncConflictSummary[] | SyncConflictDetails>>;

function replaceIpcHandler(ipcMain: IpcMainLike, channel: string, handler: IpcHandler): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}
