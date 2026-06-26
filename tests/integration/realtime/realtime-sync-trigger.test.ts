import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeSyncTriggerService } from '@main/modules/sync/realtime/realtime-sync-trigger.service';
import {
  createRemoteCustomer,
  createSyncTestInstance,
  getOutboxItems,
  RemoteCustomersMock
} from '../sync/sync-test-helpers';

describe('realtime sync trigger integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses realtime events only to trigger the existing incremental pull', async () => {
    const remote = new RemoteCustomersMock();
    const instance = createSyncTestInstance(remote);
    const remoteCustomer = createRemoteCustomer({
      id: '00000000-0000-4000-8000-000000000101',
      legal_name: 'Cliente vindo do Realtime',
      representative: 'Representante Realtime'
    });
    remote.directUpsert(remoteCustomer);
    const trigger = new RealtimeSyncTriggerService({
      debounceMs: 500,
      requestSync: instance.backgroundSyncService,
      syncStatusService: {
        markRealtimeEvent: vi.fn()
      }
    });

    trigger.handleDatabaseChange({ operation: 'INSERT', schema: 'public', table: 'customers' });
    await vi.advanceTimersByTimeAsync(500);

    expect(instance.customerRepository.findById(remoteCustomer.id)).toMatchObject({
      legalName: 'Cliente vindo do Realtime',
      representative: 'Representante Realtime'
    });
    expect(getOutboxItems(instance)).toHaveLength(0);

    instance.close();
  });

  it('coalesces many realtime events into one pull cycle', async () => {
    const remote = new RemoteCustomersMock();
    const instance = createSyncTestInstance(remote);
    remote.directUpsert(createRemoteCustomer({ id: '00000000-0000-4000-8000-000000000102' }));
    const requestSync = vi.spyOn(instance.backgroundSyncService, 'requestSync');
    const trigger = new RealtimeSyncTriggerService({
      debounceMs: 500,
      requestSync: instance.backgroundSyncService,
      syncStatusService: {
        markRealtimeEvent: vi.fn()
      }
    });

    trigger.handleDatabaseChange({ operation: 'INSERT', schema: 'public', table: 'customers' });
    trigger.handleDatabaseChange({ operation: 'UPDATE', schema: 'public', table: 'customers' });
    trigger.handleDatabaseChange({ operation: 'UPDATE', schema: 'public', table: 'customers' });
    await vi.advanceTimersByTimeAsync(500);

    expect(requestSync).toHaveBeenCalledTimes(1);

    instance.close();
  });
});
