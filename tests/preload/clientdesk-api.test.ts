import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { createClientDeskApi } from '@preload/clientdesk-api';

const electronMock = vi.hoisted(() => {
  const exposed: Array<{ key: string; value: unknown }> = [];
  const invoke = vi.fn();
  const exposeInMainWorld = vi.fn((key: string, value: unknown) => {
    exposed.push({ key, value });
  });

  return {
    exposed,
    invoke,
    exposeInMainWorld
  };
});

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: electronMock.exposeInMainWorld
  },
  ipcRenderer: {
    invoke: electronMock.invoke
  }
}));

beforeEach(() => {
  electronMock.exposed.splice(0);
  electronMock.invoke.mockReset();
  electronMock.exposeInMainWorld.mockClear();
});

describe('preload clientDesk API', () => {
  it('exposes only clientDesk from preload index', async () => {
    vi.resetModules();

    await import('@preload/index');

    expect(electronMock.exposeInMainWorld).toHaveBeenCalledOnce();
    expect(electronMock.exposed).toHaveLength(1);
    expect(electronMock.exposed[0]?.key).toBe('clientDesk');
    expect(electronMock.exposed[0]?.value).not.toHaveProperty('ipcRenderer');
    expect(electronMock.exposed[0]?.value).not.toHaveProperty('invoke');
  });

  it('uses explicit channels and forwards arguments', async () => {
    electronMock.invoke.mockResolvedValue({ success: true, data: null });
    const api = createClientDeskApi({ invoke: electronMock.invoke });

    await api.app.getVersion();
    await api.auth.getState();
    await api.auth.signIn('user@example.com', 'secret');
    await api.auth.signOut();
    await api.auth.refreshSession();
    await api.customers.create({ personType: 'FISICA', legalName: 'Maria Silva' });
    await api.customers.list({ search: 'maria', active: true });
    await api.customers.getById('customer-id');
    await api.customers.update('customer-id', { legalName: 'Maria Souza' });
    await api.customers.setActive('customer-id', false);
    await api.backup.create();
    await api.backup.restore();
    await api.backup.validate();
    await api.sync.getStatus();
    await api.sync.runNow();
    await api.sync.listConflicts();
    await api.sync.getConflict('conflict-id');
    await api.sync.resolveKeepLocal('conflict-id');
    await api.sync.resolveUseRemote('conflict-id');
    await api.audit.listCustomerHistory('customer-id', { limit: 10 });
    await api.diagnostics.getSummary();
    await api.diagnostics.listSyncRuns({ limit: 5 });
    await api.diagnostics.export();
    await api.update.getState();
    await api.update.check();
    await api.update.download();
    await api.update.install();

    expect(electronMock.invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.app.getVersion);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.auth.getState);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(3, IPC_CHANNELS.auth.signIn, {
      email: 'user@example.com',
      password: 'secret'
    });
    expect(electronMock.invoke).toHaveBeenNthCalledWith(4, IPC_CHANNELS.auth.signOut);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(5, IPC_CHANNELS.auth.refreshSession);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(6, IPC_CHANNELS.customers.create, {
      personType: 'FISICA',
      legalName: 'Maria Silva'
    });
    expect(electronMock.invoke).toHaveBeenNthCalledWith(7, IPC_CHANNELS.customers.list, {
      search: 'maria',
      active: true
    });
    expect(electronMock.invoke).toHaveBeenNthCalledWith(8, IPC_CHANNELS.customers.getById, {
      id: 'customer-id'
    });
    expect(electronMock.invoke).toHaveBeenNthCalledWith(9, IPC_CHANNELS.customers.update, {
      id: 'customer-id',
      data: {
        legalName: 'Maria Souza'
      }
    });
    expect(electronMock.invoke).toHaveBeenNthCalledWith(10, IPC_CHANNELS.customers.setActive, {
      id: 'customer-id',
      active: false
    });
    expect(electronMock.invoke).toHaveBeenNthCalledWith(11, IPC_CHANNELS.backup.create);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(12, IPC_CHANNELS.backup.restore);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(13, IPC_CHANNELS.backup.validate);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(14, IPC_CHANNELS.sync.getStatus);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(15, IPC_CHANNELS.sync.runNow);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(16, IPC_CHANNELS.sync.listConflicts);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(17, IPC_CHANNELS.sync.getConflict, {
      id: 'conflict-id'
    });
    expect(electronMock.invoke).toHaveBeenNthCalledWith(18, IPC_CHANNELS.sync.resolveKeepLocal, {
      id: 'conflict-id'
    });
    expect(electronMock.invoke).toHaveBeenNthCalledWith(19, IPC_CHANNELS.sync.resolveUseRemote, {
      id: 'conflict-id'
    });
    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      20,
      IPC_CHANNELS.audit.listCustomerHistory,
      {
        customerId: 'customer-id',
        filters: {
          limit: 10
        }
      }
    );
    expect(electronMock.invoke).toHaveBeenNthCalledWith(21, IPC_CHANNELS.diagnostics.getSummary);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      22,
      IPC_CHANNELS.diagnostics.listSyncRuns,
      {
        limit: 5
      }
    );
    expect(electronMock.invoke).toHaveBeenNthCalledWith(23, IPC_CHANNELS.diagnostics.export);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(24, IPC_CHANNELS.update.getState);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(25, IPC_CHANNELS.update.check);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(26, IPC_CHANNELS.update.download);
    expect(electronMock.invoke).toHaveBeenNthCalledWith(27, IPC_CHANNELS.update.install);
  });
});
