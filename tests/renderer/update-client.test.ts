import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkForUpdate,
  ClientDeskUpdateError,
  downloadUpdate,
  getUpdateState,
  installUpdate
} from '@renderer/services/update-client';

const updateApi = {
  getState: vi.fn(),
  check: vi.fn(),
  download: vi.fn(),
  install: vi.fn()
};

beforeEach(() => {
  updateApi.getState.mockReset();
  updateApi.check.mockReset();
  updateApi.download.mockReset();
  updateApi.install.mockReset();
  window.clientDesk = {
    update: updateApi
  } as unknown as typeof window.clientDesk;
});

describe('update-client', () => {
  it('unwraps successful update operations', async () => {
    const state = {
      status: 'IDLE',
      currentVersion: '0.1.0',
      availableVersion: null,
      downloadPercent: null,
      lastCheckedAt: null,
      errorCode: null
    };
    updateApi.getState.mockResolvedValue({ success: true, data: state });
    updateApi.check.mockResolvedValue({ success: true, data: { started: true, state } });
    updateApi.download.mockResolvedValue({ success: true, data: { started: true, state } });
    updateApi.install.mockResolvedValue({ success: true, data: { started: true, state } });

    await expect(getUpdateState()).resolves.toBe(state);
    await expect(checkForUpdate()).resolves.toEqual({ started: true, state });
    await expect(downloadUpdate()).resolves.toEqual({ started: true, state });
    await expect(installUpdate()).resolves.toEqual({ started: true, state });
  });

  it('throws a public renderer error for failed IPC results', async () => {
    updateApi.check.mockResolvedValue({
      success: false,
      error: {
        code: 'UPDATE_CHECK_FAILED',
        message: 'Não foi possível verificar ou baixar a atualização.'
      }
    });

    await expect(checkForUpdate()).rejects.toBeInstanceOf(ClientDeskUpdateError);
    await expect(checkForUpdate()).rejects.toMatchObject({
      code: 'UPDATE_CHECK_FAILED',
      message: 'Não foi possível verificar ou baixar a atualização.'
    });
  });
});
