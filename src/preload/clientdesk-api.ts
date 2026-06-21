import type { IpcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';

export interface ClientDeskApi {
  app: {
    getVersion: () => Promise<string>;
  };
}

export function createClientDeskApi(ipcRenderer: IpcRenderer): ClientDeskApi {
  return {
    app: {
      getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.app.getVersion) as Promise<string>
    }
  };
}

declare global {
  interface Window {
    clientDesk: ClientDeskApi;
  }
}
