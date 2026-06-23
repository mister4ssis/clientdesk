import type { ClientDeskApi } from '@shared/ipc/ipc-contracts';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';

interface IpcRendererInvoke {
  invoke<T>(channel: string, ...args: unknown[]): Promise<T>;
}

export function createClientDeskApi(ipcRenderer: IpcRendererInvoke): ClientDeskApi {
  return {
    app: {
      getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.app.getVersion)
    },
    customers: {
      create: (input) => ipcRenderer.invoke(IPC_CHANNELS.customers.create, input),
      list: (filters = {}) => ipcRenderer.invoke(IPC_CHANNELS.customers.list, filters),
      getById: (id) => ipcRenderer.invoke(IPC_CHANNELS.customers.getById, { id }),
      update: (id, data) => ipcRenderer.invoke(IPC_CHANNELS.customers.update, { id, data }),
      setActive: (id, active) =>
        ipcRenderer.invoke(IPC_CHANNELS.customers.setActive, { id, active })
    },
    backup: {
      create: () => ipcRenderer.invoke(IPC_CHANNELS.backup.create),
      restore: () => ipcRenderer.invoke(IPC_CHANNELS.backup.restore),
      validate: () => ipcRenderer.invoke(IPC_CHANNELS.backup.validate)
    },
    sync: {
      getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.sync.getStatus),
      runNow: () => ipcRenderer.invoke(IPC_CHANNELS.sync.runNow)
    }
  } satisfies ClientDeskApi;
}
