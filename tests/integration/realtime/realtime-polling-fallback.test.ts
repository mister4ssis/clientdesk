import { describe, expect, it } from 'vitest';
import {
  createRemoteCustomer,
  createSyncTestInstance,
  RemoteCustomersMock
} from '../sync/sync-test-helpers';

describe('realtime polling fallback integration', () => {
  it('keeps polling able to recover a remote change when no realtime event is received', async () => {
    const remote = new RemoteCustomersMock();
    const instance = createSyncTestInstance(remote);
    const remoteCustomer = createRemoteCustomer({
      id: '00000000-0000-4000-8000-000000000201',
      legal_name: 'Cliente recuperado pelo polling'
    });
    remote.directUpsert(remoteCustomer);

    await instance.backgroundSyncService.requestSync({ reason: 'SCHEDULER' });

    expect(instance.customerRepository.findById(remoteCustomer.id)).toMatchObject({
      legalName: 'Cliente recuperado pelo polling'
    });

    instance.close();
  });
});
