import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSyncStatus,
  listSyncConflicts,
  resolveSyncConflictUseRemote,
  runSyncNow
} from '@renderer/services/sync-client';

beforeEach(() => {
  window.clientDesk = {
    ...window.clientDesk,
    sync: {
      getStatus: vi.fn(),
      runNow: vi.fn(),
      listConflicts: vi.fn(),
      getConflict: vi.fn(),
      resolveKeepLocal: vi.fn(),
      resolveUseRemote: vi.fn()
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

  it('returns pending conflicts on success', async () => {
    vi.mocked(window.clientDesk.sync.listConflicts).mockResolvedValue({
      success: true,
      data: []
    });

    await expect(listSyncConflicts()).resolves.toEqual([]);
    expect(window.clientDesk.sync.listConflicts).toHaveBeenCalledOnce();
  });

  it('forwards conflict resolution calls', async () => {
    vi.mocked(window.clientDesk.sync.resolveUseRemote).mockResolvedValue({
      success: true,
      data: syncConflict
    });

    await expect(resolveSyncConflictUseRemote(syncConflict.id)).resolves.toBe(syncConflict);
    expect(window.clientDesk.sync.resolveUseRemote).toHaveBeenCalledWith(syncConflict.id);
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
    syncStatus: 'PENDING' as const,
    lastSyncedAt: null,
    syncErrorCode: null,
    remoteVersion: 1,
    remoteUpdatedAt: '2026-06-23T09:00:00.000Z',
    deletedAt: null
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
    syncStatus: 'SYNCED' as const,
    lastSyncedAt: null,
    syncErrorCode: null,
    remoteVersion: 2,
    remoteUpdatedAt: '2026-06-23T10:01:00.000Z',
    deletedAt: null
  }
};
