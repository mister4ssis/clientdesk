import { afterEach, describe, expect, it } from 'vitest';
import { ErrorCode } from '@main/errors/error-codes';
import {
  createCustomer,
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

describe('sync connection failure recovery', () => {
  it('keeps outbox when push fails and resumes without remote duplication', async () => {
    const remote = new RemoteCustomersMock();
    const instance = track(createSyncTestInstance(remote));
    const customer = createCustomer({
      id: '00000000-0000-4000-8000-000000000501',
      legalName: 'Cliente Push Falho'
    });

    instance.customerRepository.create(customer);
    remote.failNextRpc();

    const failedResult = await instance.backgroundSyncService.runNow();

    expect(failedResult.status.lastErrorCode).toBe(ErrorCode.SyncRemoteError);
    expect(instance.syncOutboxRepository.countPending()).toBe(1);
    expect(remote.get(customer.id)).toBeNull();

    instance.database
      .prepare(
        `
          UPDATE sync_outbox
          SET next_attempt_at = NULL
        `
      )
      .run();

    const recoveredResult = await instance.backgroundSyncService.runNow();

    expect(recoveredResult.status.lastErrorCode).toBeNull();
    expect(instance.syncOutboxRepository.countPending()).toBe(0);
    expect(remote.get(customer.id)).toMatchObject({
      id: customer.id,
      version: 1
    });
  });

  it('does not advance cursor when pull fails and recovers on next cycle', async () => {
    const remote = new RemoteCustomersMock();
    const instance = track(createSyncTestInstance(remote));
    const remoteCustomer = createRemoteCustomer({
      id: '00000000-0000-4000-8000-000000000502',
      legal_name: 'Cliente Pull Falho'
    });
    remote.directUpsert(remoteCustomer);
    remote.failNextQuery();

    const failedResult = await instance.backgroundSyncService.runNow();

    expect(failedResult.status.lastErrorCode).toBe(ErrorCode.SyncRemoteError);
    expect(getCursor(instance)).toMatchObject({
      lastRemoteUpdatedAt: null,
      lastRemoteId: null
    });

    await instance.sync();

    expect(instance.customerRepository.findById(remoteCustomer.id)).toMatchObject({
      legalName: 'Cliente Pull Falho'
    });
    expect(getCursor(instance)).toMatchObject({
      lastRemoteId: remoteCustomer.id
    });
  });

  it('does not start overlapping sync runs', async () => {
    const remote = new RemoteCustomersMock();
    const instance = track(createSyncTestInstance(remote, { connectivity: 'OFFLINE' }));
    const firstRun = instance.backgroundSyncService.runNow();
    const secondRun = await instance.backgroundSyncService.runNow();

    await firstRun;

    expect(secondRun).toMatchObject({
      started: false,
      status: {
        lastErrorCode: ErrorCode.SyncOperationInProgress
      }
    });
  });
});

function track(instance: SyncTestInstance): SyncTestInstance {
  instances.push(instance);

  return instance;
}
