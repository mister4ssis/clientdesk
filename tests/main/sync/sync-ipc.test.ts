import { describe, expect, it, vi } from 'vitest';
import { registerSyncIpcHandlers } from '@main/modules/sync/sync.ipc';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';

describe('sync IPC handlers', () => {
  it('registers status and manual run channels', async () => {
    const ipcMain = createMockIpcMain();
    const syncService = {
      getStatus: vi.fn(() => syncStatus),
      runNow: vi.fn(async () => ({ started: true, status: syncStatus }))
    };

    registerSyncIpcHandlers({ ipcMain, syncService });

    expect(ipcMain.registeredChannels()).toEqual([
      IPC_CHANNELS.sync.getStatus,
      IPC_CHANNELS.sync.runNow
    ]);
    await expect(ipcMain.invoke(IPC_CHANNELS.sync.getStatus)).resolves.toMatchObject({
      success: true,
      data: syncStatus
    });
    await expect(ipcMain.invoke(IPC_CHANNELS.sync.runNow)).resolves.toMatchObject({
      success: true,
      data: {
        started: true,
        status: syncStatus
      }
    });
  });

  it('registers conflict channels when conflict service is provided', async () => {
    const ipcMain = createMockIpcMain();
    const syncService = {
      getStatus: vi.fn(() => syncStatus),
      runNow: vi.fn(async () => ({ started: true, status: syncStatus }))
    };
    const customerConflictService = {
      listConflicts: vi.fn(() => [syncConflict]),
      getConflict: vi.fn(() => syncConflict),
      resolveKeepLocal: vi.fn(async () => resolvedLocalConflict),
      resolveUseRemote: vi.fn(() => resolvedRemoteConflict)
    };

    registerSyncIpcHandlers({ ipcMain, syncService, customerConflictService });

    expect(ipcMain.registeredChannels()).toEqual([
      IPC_CHANNELS.sync.getStatus,
      IPC_CHANNELS.sync.runNow,
      IPC_CHANNELS.sync.listConflicts,
      IPC_CHANNELS.sync.getConflict,
      IPC_CHANNELS.sync.resolveKeepLocal,
      IPC_CHANNELS.sync.resolveUseRemote
    ]);
    await expect(ipcMain.invoke(IPC_CHANNELS.sync.listConflicts)).resolves.toMatchObject({
      success: true,
      data: [syncConflict]
    });
    await expect(
      ipcMain.invoke(IPC_CHANNELS.sync.resolveKeepLocal, { id: syncConflict.id })
    ).resolves.toMatchObject({
      success: true,
      data: resolvedLocalConflict
    });
    expect(customerConflictService.resolveKeepLocal).toHaveBeenCalledWith(syncConflict.id);
  });
});

const syncStatus = {
  enabled: false,
  pullEnabled: false,
  connectivity: 'DISABLED' as const,
  running: false,
  direction: 'IDLE' as const,
  pendingCount: 0,
  conflictCount: 0,
  lastStartedAt: null,
  lastCompletedAt: null,
  lastSuccessfulAt: null,
  lastPushAt: null,
  lastPullAt: null,
  lastErrorCode: null
};

const syncConflict = {
  id: '11111111-1111-4111-8111-111111111111',
  entityId: '22222222-2222-4222-8222-222222222222',
  customerName: 'Cliente Teste',
  localUpdatedAt: '2026-06-23T10:00:00.000Z',
  remoteUpdatedAt: '2026-06-23T10:01:00.000Z',
  remoteVersion: 2,
  status: 'PENDING' as const,
  createdAt: '2026-06-23T10:02:00.000Z',
  localData: {
    id: '22222222-2222-4222-8222-222222222222',
    personType: 'FISICA' as const,
    legalName: 'Cliente Local',
    tradeName: null,
    representative: null,
    taxId: null,
    email: null,
    phone: null,
    birthDate: null,
    postalCode: null,
    street: null,
    addressNumber: null,
    addressComplement: null,
    neighborhood: null,
    city: null,
    state: null,
    notes: null,
    active: true,
    createdAt: '2026-06-23T09:00:00.000Z',
    updatedAt: '2026-06-23T10:00:00.000Z',
    deletedAt: null,
    remoteVersion: 1,
    remoteUpdatedAt: '2026-06-23T09:00:00.000Z'
  },
  remoteData: {
    id: '22222222-2222-4222-8222-222222222222',
    personType: 'FISICA' as const,
    legalName: 'Cliente Remoto',
    tradeName: null,
    representative: null,
    taxId: null,
    email: null,
    phone: null,
    birthDate: null,
    postalCode: null,
    street: null,
    addressNumber: null,
    addressComplement: null,
    neighborhood: null,
    city: null,
    state: null,
    notes: null,
    active: true,
    createdAt: '2026-06-23T09:00:00.000Z',
    updatedAt: '2026-06-23T10:01:00.000Z',
    deletedAt: null,
    remoteVersion: 2,
    remoteUpdatedAt: '2026-06-23T10:01:00.000Z'
  }
};

const resolvedLocalConflict = {
  ...syncConflict,
  status: 'RESOLVED_LOCAL' as const
};

const resolvedRemoteConflict = {
  ...syncConflict,
  status: 'RESOLVED_REMOTE' as const
};

function createMockIpcMain() {
  const handlers = new Map<string, (event: unknown, input?: unknown) => unknown>();

  return {
    handle: vi.fn((channel: string, handler: (event: unknown, input?: unknown) => unknown) => {
      handlers.set(channel, handler);
    }),
    removeHandler: vi.fn((channel: string) => {
      handlers.delete(channel);
    }),
    registeredChannels: () => Array.from(handlers.keys()),
    invoke: async (channel: string, input?: unknown) => {
      const handler = handlers.get(channel);

      if (!handler) {
        throw new Error(`Missing handler: ${channel}`);
      }

      return handler({}, input);
    }
  };
}
