import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSyncStatus, runSyncNow } from '@renderer/services/sync-client';

beforeEach(() => {
  window.clientDesk = {
    ...window.clientDesk,
    sync: {
      getStatus: vi.fn(),
      runNow: vi.fn()
    }
  };
});

describe('sync-client', () => {
  it('returns sync status on success', async () => {
    vi.mocked(window.clientDesk.sync.getStatus).mockResolvedValue({
      success: true,
      data: syncStatus
    });

    await expect(getSyncStatus()).resolves.toBe(syncStatus);
    expect(window.clientDesk.sync.getStatus).toHaveBeenCalledOnce();
  });

  it('preserves public error code and message', async () => {
    vi.mocked(window.clientDesk.sync.runNow).mockResolvedValue({
      success: false,
      error: {
        code: 'SYNC_DISABLED',
        message: 'A sincronização está desabilitada.'
      }
    });

    await expect(runSyncNow()).rejects.toMatchObject({
      code: 'SYNC_DISABLED',
      message: 'A sincronização está desabilitada.'
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
