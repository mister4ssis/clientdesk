import { afterEach, describe, expect, it } from 'vitest';
import { ErrorCode } from '@main/errors/error-codes';
import {
  createCustomer,
  createRemoteCustomer,
  createSyncTestInstance,
  RemoteCustomersMock,
  type SyncTestInstance
} from './sync-test-helpers';

const instances: SyncTestInstance[] = [];

afterEach(() => {
  for (const instance of instances.splice(0)) {
    instance.close();
  }
});

describe('multi-instance conflict resolution', () => {
  it('detects conflict and resolves by keeping local data', async () => {
    const { instanceA, instanceB, remote, customerId } = await createSyncedPair();

    instanceB.customerRepository.update(customerId, {
      legalName: 'Edicao Local em B',
      representative: 'Representante Local',
      updatedAt: '2026-06-24T12:00:00.000Z'
    });
    instanceA.customerRepository.update(customerId, {
      legalName: 'Edicao Remota de A',
      representative: 'Representante Remoto A',
      updatedAt: '2026-06-24T12:01:00.000Z'
    });

    await instanceA.sync();
    await instanceB.sync();

    const conflict = instanceB.syncConflictRepository.listPending()[0];
    expect(conflict).toMatchObject({
      entityId: customerId,
      remoteVersion: 2
    });
    expect(instanceB.customerRepository.findById(customerId)).toMatchObject({
      legalName: 'Edicao Local em B'
    });

    await instanceB.customerConflictService.resolveKeepLocal(conflict.id);
    await instanceA.sync();

    expect(remote.get(customerId)).toMatchObject({
      legal_name: 'Edicao Local em B',
      representative: 'Representante Local',
      version: 3
    });
    expect(instanceA.customerRepository.findById(customerId)).toMatchObject({
      legalName: 'Edicao Local em B',
      representative: 'Representante Local'
    });
    expect(instanceB.syncConflictRepository.countPending()).toBe(0);
    expect(instanceB.syncOutboxRepository.countPending()).toBe(0);
  });

  it('detects conflict and resolves by applying remote data without creating outbox', async () => {
    const { instanceA, instanceB, customerId } = await createSyncedPair();

    instanceB.customerRepository.update(customerId, {
      legalName: 'Edicao Local Descartada',
      updatedAt: '2026-06-24T12:10:00.000Z'
    });
    instanceA.customerRepository.update(customerId, {
      legalName: 'Edicao Remota Mantida',
      updatedAt: '2026-06-24T12:11:00.000Z'
    });

    await instanceA.sync();
    await instanceB.sync();

    const conflict = instanceB.syncConflictRepository.listPending()[0];
    instanceB.customerConflictService.resolveUseRemote(conflict.id);

    expect(instanceB.customerRepository.findById(customerId)).toMatchObject({
      legalName: 'Edicao Remota Mantida'
    });
    expect(instanceB.syncOutboxRepository.countPending()).toBe(0);
    expect(instanceB.syncConflictRepository.countPending()).toBe(0);
  });

  it('keeps conflict pending when remote changed again before keep-local resolution', async () => {
    const { instanceA, instanceB, remote, customerId } = await createSyncedPair();

    instanceB.customerRepository.update(customerId, {
      legalName: 'Versao Local Obsoleta',
      updatedAt: '2026-06-24T12:20:00.000Z'
    });
    instanceA.customerRepository.update(customerId, {
      legalName: 'Versao Remota 2',
      updatedAt: '2026-06-24T12:21:00.000Z'
    });

    await instanceA.sync();
    await instanceB.sync();

    const conflict = instanceB.syncConflictRepository.listPending()[0];
    remote.directUpsert(createRemoteCustomer({
      id: customerId,
      legal_name: 'Versao Remota 3',
      version: 3,
      updated_at: '2026-06-24T12:22:00.000Z'
    }));

    await expect(
      instanceB.customerConflictService.resolveKeepLocal(conflict.id)
    ).rejects.toMatchObject({
      code: ErrorCode.SyncConflict
    });
    expect(instanceB.syncConflictRepository.countPending()).toBe(1);
    expect(remote.get(customerId)).toMatchObject({
      legal_name: 'Versao Remota 3',
      version: 3
    });
  });
});

async function createSyncedPair(): Promise<{
  instanceA: SyncTestInstance;
  instanceB: SyncTestInstance;
  remote: RemoteCustomersMock;
  customerId: string;
}> {
  const remote = new RemoteCustomersMock();
  const instanceA = track(createSyncTestInstance(remote));
  const instanceB = track(createSyncTestInstance(remote));
  const customerId = '00000000-0000-4000-8000-000000000301';

  instanceA.customerRepository.create(createCustomer({
    id: customerId,
    legalName: 'Cliente Base'
  }));

  await instanceA.sync();
  await instanceB.sync();

  return {
    instanceA,
    instanceB,
    remote,
    customerId
  };
}

function track(instance: SyncTestInstance): SyncTestInstance {
  instances.push(instance);

  return instance;
}
