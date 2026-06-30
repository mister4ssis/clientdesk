import { describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { ErrorCode } from '../../../src/main/errors/error-codes';
import { ApplicationError } from '../../../src/main/errors/application-error';
import { registerUpdateIpcHandlers } from '../../../src/main/modules/update/update.ipc';
import type { UpdateServiceContract } from '../../../src/main/modules/update/update.ipc';

describe('registerUpdateIpcHandlers', () => {
  it('returns update state through a specific channel', async () => {
    const ipcMain = createIpcMainMock();
    const service = createUpdateService();
    registerUpdateIpcHandlers({ ipcMain, updateService: service });

    const result = await ipcMain.invoke(IPC_CHANNELS.update.getState);

    expect(result).toEqual({
      success: true,
      data: service.getState()
    });
  });

  it('sanitizes installation blockers', async () => {
    const ipcMain = createIpcMainMock();
    const service = createUpdateService({
      install: () => {
        throw new ApplicationError(ErrorCode.UpdateInstallBlocked, 'Operação crítica.');
      }
    });
    registerUpdateIpcHandlers({ ipcMain, updateService: service });

    const result = await ipcMain.invoke(IPC_CHANNELS.update.install);

    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.UpdateInstallBlocked,
        message: 'Conclua a operação atual antes de instalar a atualização.'
      }
    });
  });
});

function createUpdateService(overrides: Partial<UpdateServiceContract> = {}): UpdateServiceContract {
  const state = {
    status: 'IDLE' as const,
    currentVersion: '0.1.0',
    availableVersion: null,
    downloadPercent: null,
    lastCheckedAt: null,
    errorCode: null
  };

  return {
    getState: () => state,
    check: async () => ({ started: true, state }),
    download: async () => ({ started: true, state }),
    install: () => ({ started: true, state }),
    ...overrides
  };
}

function createIpcMainMock() {
  const handlers = new Map<string, (event: Electron.IpcMainInvokeEvent) => Promise<unknown>>();

  return {
    handle: vi.fn((channel: string, handler: (event: Electron.IpcMainInvokeEvent) => Promise<unknown>) => {
      handlers.set(channel, handler);
    }),
    removeHandler: vi.fn((channel: string) => {
      handlers.delete(channel);
    }),
    invoke: async (channel: string) => {
      const handler = handlers.get(channel);

      if (!handler) {
        throw new Error(`Missing handler for ${channel}`);
      }

      return handler({} as Electron.IpcMainInvokeEvent);
    }
  };
}
