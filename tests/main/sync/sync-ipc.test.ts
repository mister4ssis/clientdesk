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
});

const syncStatus = {
  enabled: false,
  connectivity: 'DISABLED' as const,
  running: false,
  pendingCount: 0,
  lastStartedAt: null,
  lastCompletedAt: null,
  lastSuccessfulAt: null,
  lastErrorCode: null
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
