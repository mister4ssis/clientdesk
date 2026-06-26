import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeSyncTriggerService } from '@main/modules/sync/realtime/realtime-sync-trigger.service';
import type { SyncRunResult, SyncStatus } from '@shared/sync/sync.types';

describe('RealtimeSyncTriggerService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debounces multiple realtime events into one sync request', async () => {
    const { service, requestSync, syncStatusService } = createService();

    service.handleDatabaseChange(createPayload('INSERT'));
    service.handleDatabaseChange(createPayload('UPDATE'));
    service.handleDatabaseChange(createPayload('UPDATE'));

    expect(syncStatusService.markRealtimeEvent).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(499);
    expect(requestSync.requestSync).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(requestSync.requestSync).toHaveBeenCalledTimes(1);
    expect(requestSync.requestSync).toHaveBeenCalledWith({ reason: 'REALTIME_EVENT' });
  });

  it('does not apply or require payload contents beyond minimal metadata', async () => {
    const { service, requestSync } = createService();

    service.handleDatabaseChange({
      operation: 'UPDATE',
      schema: 'public',
      table: 'customers',
      record: {
        legal_name: 'Cliente que nao deve ser aplicado diretamente'
      }
    });
    await vi.advanceTimersByTimeAsync(500);

    expect(requestSync.requestSync).toHaveBeenCalledTimes(1);
  });

  it('ignores invalid payloads and stopped service', async () => {
    const { service, requestSync } = createService();

    service.handleDatabaseChange({ operation: 'UPDATE', schema: 'public', table: 'orders' });
    service.stop();
    service.handleDatabaseChange(createPayload('UPDATE'));
    await vi.advanceTimersByTimeAsync(500);

    expect(requestSync.requestSync).not.toHaveBeenCalled();
  });

  it('schedules another cycle when an event arrives during synchronization', async () => {
    const deferred = createDeferred<SyncRunResult>();
    const { service, requestSync } = createService({
      requestSyncResult: () => deferred.promise
    });

    service.handleDatabaseChange(createPayload('UPDATE'));
    await vi.advanceTimersByTimeAsync(500);
    service.handleDatabaseChange(createPayload('UPDATE'));
    deferred.resolve(createSyncResult());
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(500);

    expect(requestSync.requestSync).toHaveBeenCalledTimes(2);
  });

  it('keeps polling fallback alive when sync request reports operation in progress', async () => {
    const { service, requestSync } = createService({
      firstResult: createSyncResult('SYNC_OPERATION_IN_PROGRESS')
    });

    service.handleDatabaseChange(createPayload('UPDATE'));
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(500);

    expect(requestSync.requestSync).toHaveBeenCalledTimes(2);
  });
});

function createService(options: {
  firstResult?: SyncRunResult;
  requestSyncResult?: () => Promise<SyncRunResult>;
} = {}) {
  const requestSync = {
    requestSync: vi.fn(() => {
      if (options.requestSyncResult) {
        return options.requestSyncResult();
      }

      return Promise.resolve(
        requestSync.requestSync.mock.calls.length === 1 && options.firstResult
          ? options.firstResult
          : createSyncResult()
      );
    })
  };
  const syncStatusService = {
    markRealtimeEvent: vi.fn()
  };
  const service = new RealtimeSyncTriggerService({
    debounceMs: 500,
    requestSync,
    syncStatusService
  });

  return {
    service,
    requestSync,
    syncStatusService
  };
}

function createPayload(operation: 'INSERT' | 'UPDATE' | 'DELETE') {
  return {
    operation,
    schema: 'public',
    table: 'customers'
  };
}

function createSyncResult(lastErrorCode: string | null = null): SyncRunResult {
  return {
    started: lastErrorCode === null,
    status: createSyncStatus(lastErrorCode)
  };
}

function createSyncStatus(lastErrorCode: string | null): SyncStatus {
  return {
    enabled: true,
    pullEnabled: true,
    realtimeStatus: 'SUBSCRIBED',
    connectivity: 'ONLINE',
    running: false,
    direction: 'IDLE',
    pendingCount: 0,
    conflictCount: 0,
    lastStartedAt: null,
    lastCompletedAt: null,
    lastPushAt: null,
    lastPullAt: null,
    lastRealtimeEventAt: null,
    lastRealtimeConnectedAt: null,
    lastSuccessfulAt: null,
    lastErrorCode
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return {
    promise,
    resolve
  };
}
