import { app, type IpcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { registerCustomerIpcHandlers } from '../modules/customers/customer.ipc';

export function registerIpcHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.app.getVersion, () => app.getVersion());
  registerCustomerIpcHandlers(ipcMain);
}
