import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createCustomer,
  createDatabasePath,
  createSyncTestInstance,
  getOutboxItems,
  RemoteCustomersMock,
  type SyncTestInstance
} from './sync-test-helpers';

const instances: SyncTestInstance[] = [];
const tempDirectories: string[] = [];

afterEach(() => {
  for (const instance of instances.splice(0)) {
    instance.close();
  }

  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('offline recovery sync', () => {
  it('persists local outbox across restart and syncs later', async () => {
    const remote = new RemoteCustomersMock();
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'clientdesk-sync-'));
    tempDirectories.push(tempDirectory);
    const databasePath = createDatabasePath(tempDirectory, 'instance-a');
    let instanceA = track(createSyncTestInstance(remote, {
      databasePath,
      connectivity: 'OFFLINE'
    }));
    const instanceB = track(createSyncTestInstance(remote));
    const offlineCustomer = createCustomer({
      id: '00000000-0000-4000-8000-000000000201',
      legalName: 'Cliente Offline A',
      representative: 'Representante Offline'
    });

    instanceA.customerRepository.create(offlineCustomer);
    await instanceA.sync();

    expect(instanceA.customerRepository.findById(offlineCustomer.id)).toMatchObject({
      legalName: 'Cliente Offline A'
    });
    expect(getOutboxItems(instanceA)).toHaveLength(1);
    expect(remote.get(offlineCustomer.id)).toBeNull();

    instanceA.close();
    instances.splice(instances.indexOf(instanceA), 1);
    instanceA = track(createSyncTestInstance(remote, {
      databasePath,
      connectivity: 'OFFLINE'
    }));

    expect(instanceA.customerRepository.findById(offlineCustomer.id)).toMatchObject({
      legalName: 'Cliente Offline A'
    });
    expect(getOutboxItems(instanceA)).toHaveLength(1);

    instanceA.setConnectivity('ONLINE');
    await instanceA.sync();
    await instanceB.sync();

    expect(instanceA.syncOutboxRepository.countPending()).toBe(0);
    expect(remote.get(offlineCustomer.id)).toMatchObject({
      legal_name: 'Cliente Offline A',
      representative: 'Representante Offline'
    });
    expect(instanceB.customerRepository.findById(offlineCustomer.id)).toMatchObject({
      legalName: 'Cliente Offline A'
    });
  });
});

function track(instance: SyncTestInstance): SyncTestInstance {
  instances.push(instance);

  return instance;
}
