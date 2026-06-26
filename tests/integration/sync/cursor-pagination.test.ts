import { afterEach, describe, expect, it } from 'vitest';
import { ErrorCode } from '@main/errors/error-codes';
import {
  createRemoteCustomer,
  createSyncTestInstance,
  getCursor,
  RemoteCustomersMock,
  type SyncTestInstance
} from './sync-test-helpers';

const instances: SyncTestInstance[] = [];

afterEach(() => {
  for (const instance of instances.splice(0)) {
    instance.close();
  }
});

describe('sync cursor pagination', () => {
  it('does not lose records with the same updated_at and different ids', async () => {
    const remote = new RemoteCustomersMock();
    const sameUpdatedAt = '2026-06-24T13:00:00.000Z';
    const instance = track(createSyncTestInstance(remote, { pullBatchSize: 1 }));

    remote.directUpsert(createRemoteCustomer({
      id: '00000000-0000-4000-8000-000000000401',
      legal_name: 'Cliente Cursor 1',
      updated_at: sameUpdatedAt
    }));
    remote.directUpsert(createRemoteCustomer({
      id: '00000000-0000-4000-8000-000000000402',
      legal_name: 'Cliente Cursor 2',
      updated_at: sameUpdatedAt
    }));
    remote.directUpsert(createRemoteCustomer({
      id: '00000000-0000-4000-8000-000000000403',
      legal_name: 'Cliente Cursor 3',
      updated_at: sameUpdatedAt
    }));

    await instance.sync();

    expect(instance.customerRepository.list({}).items).toHaveLength(3);
    expect(getCursor(instance)).toMatchObject({
      lastRemoteUpdatedAt: sameUpdatedAt,
      lastRemoteId: '00000000-0000-4000-8000-000000000403'
    });
    expect(instance.syncOutboxRepository.countPending()).toBe(0);
  });

  it('does not advance cursor when a remote row is invalid', async () => {
    const remote = new RemoteCustomersMock();
    const instance = track(createSyncTestInstance(remote));

    remote.directUpsert(createRemoteCustomer({
      id: '00000000-0000-4000-8000-000000000404',
      legal_name: undefined as unknown as string,
      updated_at: '2026-06-24T13:10:00.000Z'
    }));

    const result = await instance.backgroundSyncService.runNow();

    expect(result.status.lastErrorCode).toBe(ErrorCode.SyncValidationError);
    expect(getCursor(instance)).toMatchObject({
      lastRemoteUpdatedAt: null,
      lastRemoteId: null
    });
    expect(instance.customerRepository.list({}).items).toHaveLength(0);
  });
});

function track(instance: SyncTestInstance): SyncTestInstance {
  instances.push(instance);

  return instance;
}
