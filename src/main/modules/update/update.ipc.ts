import type { UpdateOperationResult, UpdateState } from '@shared/update/update.types';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { createIpcHandler } from '../../ipc/ipc-error-handler';
import type { IpcMainLike } from '../../ipc/register-ipc-handlers';

export interface UpdateServiceContract {
  getState(): UpdateState;
  check(): Promise<UpdateOperationResult>;
  download(): Promise<UpdateOperationResult>;
  install(): UpdateOperationResult;
}

export function registerUpdateIpcHandlers({
  ipcMain,
  updateService
}: {
  ipcMain: IpcMainLike;
  updateService: UpdateServiceContract;
}): void {
  ipcMain.removeHandler(IPC_CHANNELS.update.getState);
  ipcMain.handle(
    IPC_CHANNELS.update.getState,
    createIpcHandler<UpdateState>(IPC_CHANNELS.update.getState, () => updateService.getState())
  );

  ipcMain.removeHandler(IPC_CHANNELS.update.check);
  ipcMain.handle(
    IPC_CHANNELS.update.check,
    createIpcHandler<UpdateOperationResult>(IPC_CHANNELS.update.check, () =>
      updateService.check()
    )
  );

  ipcMain.removeHandler(IPC_CHANNELS.update.download);
  ipcMain.handle(
    IPC_CHANNELS.update.download,
    createIpcHandler<UpdateOperationResult>(IPC_CHANNELS.update.download, () =>
      updateService.download()
    )
  );

  ipcMain.removeHandler(IPC_CHANNELS.update.install);
  ipcMain.handle(
    IPC_CHANNELS.update.install,
    createIpcHandler<UpdateOperationResult>(IPC_CHANNELS.update.install, () =>
      updateService.install()
    )
  );
}
