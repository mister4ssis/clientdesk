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
    auth: {
      getState: () => ipcRenderer.invoke(IPC_CHANNELS.auth.getState),
      signIn: (email, password) =>
        ipcRenderer.invoke(IPC_CHANNELS.auth.signIn, { email, password }),
      signOut: () => ipcRenderer.invoke(IPC_CHANNELS.auth.signOut),
      refreshSession: () => ipcRenderer.invoke(IPC_CHANNELS.auth.refreshSession)
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
      runNow: () => ipcRenderer.invoke(IPC_CHANNELS.sync.runNow),
      listConflicts: () => ipcRenderer.invoke(IPC_CHANNELS.sync.listConflicts),
      getConflict: (id) => ipcRenderer.invoke(IPC_CHANNELS.sync.getConflict, { id }),
      resolveKeepLocal: (id) =>
        ipcRenderer.invoke(IPC_CHANNELS.sync.resolveKeepLocal, { id }),
      resolveUseRemote: (id) =>
        ipcRenderer.invoke(IPC_CHANNELS.sync.resolveUseRemote, { id })
    },
    audit: {
      listCustomerHistory: (customerId, filters = {}) =>
        ipcRenderer.invoke(IPC_CHANNELS.audit.listCustomerHistory, { customerId, filters })
    },
    diagnostics: {
      getSummary: () => ipcRenderer.invoke(IPC_CHANNELS.diagnostics.getSummary),
      listSyncRuns: (filters = {}) =>
        ipcRenderer.invoke(IPC_CHANNELS.diagnostics.listSyncRuns, filters),
      export: () => ipcRenderer.invoke(IPC_CHANNELS.diagnostics.export)
    }
  } satisfies ClientDeskApi;
}
