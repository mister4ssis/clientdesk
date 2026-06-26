import { afterEach, describe, expect, it } from 'vitest';
import {
  createCustomer,
  createSyncTestInstance,
  getCursor,
  getOutboxItems,
  otherUserId,
  RemoteCustomersMock,
  sameUserId,
  type SyncTestInstance
} from './sync-test-helpers';

const instances: SyncTestInstance[] = [];

afterEach(() => {
  for (const instance of instances.splice(0)) {
    instance.close();
  }
});

describe('two instance sync', () => {
  it('converges when A creates a customer and B pulls it', async () => {
    const remote = new RemoteCustomersMock();
    const instanceA = track(createSyncTestInstance(remote));
    const instanceB = track(createSyncTestInstance(remote));
    const customer = createCustomer({
      id: '00000000-0000-4000-8000-000000000101',
      legalName: 'Cliente Criado na Instancia A',
      representative: 'Representante A'
    });

    instanceA.customerRepository.create(customer);

    expect(getOutboxItems(instanceA)).toHaveLength(1);

    await instanceA.sync();
    await instanceB.sync();

    expect(instanceA.syncOutboxRepository.countPending()).toBe(0);
    expect(instanceB.syncOutboxRepository.countPending()).toBe(0);
    expect(remote.get(customer.id)).toMatchObject({
      id: customer.id,
      legal_name: 'Cliente Criado na Instancia A',
      representative: 'Representante A',
      version: 1
    });
    expect(instanceB.customerRepository.findById(customer.id)).toMatchObject({
      id: customer.id,
      legalName: 'Cliente Criado na Instancia A',
      representative: 'Representante A'
    });
    expect(instanceB.customerRepository.getSyncMetadata(customer.id)).toMatchObject({
      syncStatus: 'SYNCED',
      remoteVersion: 1
    });
  });

  it('converges when B updates a customer and A pulls the update without duplication', async () => {
    const remote = new RemoteCustomersMock();
    const instanceA = track(createSyncTestInstance(remote));
    const instanceB = track(createSyncTestInstance(remote));
    const customer = createCustomer({
      id: '00000000-0000-4000-8000-000000000102',
      legalName: 'Cliente Original',
      representative: 'Representante Original'
    });

    instanceA.customerRepository.create(customer);
    await instanceA.sync();
    await instanceB.sync();

    instanceB.customerRepository.update(customer.id, {
      legalName: 'Cliente Atualizado em B',
      representative: 'Representante B',
      phone: '31988887777',
      updatedAt: '2026-06-24T11:00:00.000Z'
    });

    await instanceB.sync();
    await instanceA.sync();

    expect(instanceA.customerRepository.findById(customer.id)).toMatchObject({
      legalName: 'Cliente Atualizado em B',
      representative: 'Representante B',
      phone: '31988887777'
    });
    expect(instanceA.customerRepository.list({ active: true }).items).toHaveLength(1);
    expect(getCursor(instanceA)).toMatchObject({
      lastRemoteId: customer.id
    });
    expect(remote.get(customer.id)).toMatchObject({
      version: 2
    });
  });

  it('syncs deactivation and reactivation between installations', async () => {
    const remote = new RemoteCustomersMock();
    const instanceA = track(createSyncTestInstance(remote));
    const instanceB = track(createSyncTestInstance(remote));
    const customer = createCustomer({
      id: '00000000-0000-4000-8000-000000000103'
    });

    instanceA.customerRepository.create(customer);
    await instanceA.sync();
    await instanceB.sync();

    instanceA.customerRepository.setActive(
      customer.id,
      false,
      '2026-06-24T11:10:00.000Z'
    );
    await instanceA.sync();
    await instanceB.sync();

    expect(instanceB.customerRepository.findById(customer.id)).toMatchObject({
      active: false
    });

    instanceB.customerRepository.setActive(
      customer.id,
      true,
      '2026-06-24T11:20:00.000Z'
    );
    await instanceB.sync();
    await instanceA.sync();

    expect(instanceA.customerRepository.findById(customer.id)).toMatchObject({
      active: true
    });
    expect(instanceA.customerRepository.list({ active: true }).items).toHaveLength(1);
  });

  it('keeps different users isolated even when they use the same remote mock', async () => {
    const remote = new RemoteCustomersMock();
    const userA = track(createSyncTestInstance(remote, { userId: sameUserId }));
    const userB = track(createSyncTestInstance(remote, { userId: otherUserId }));
    const customerA = createCustomer({
      id: '00000000-0000-4000-8000-000000000104',
      legalName: 'Cliente Usuario A',
      taxId: '12345678901'
    });
    const customerB = createCustomer({
      id: '00000000-0000-4000-8000-000000000105',
      legalName: 'Cliente Usuario B',
      taxId: '12345678901'
    });

    userA.customerRepository.create(customerA);
    userB.customerRepository.create(customerB);
    await userA.sync();
    await userB.sync();
    await userA.sync();
    await userB.sync();

    expect(remote.countForUser(sameUserId)).toBe(1);
    expect(remote.countForUser(otherUserId)).toBe(1);
    expect(userA.customerRepository.findById(customerB.id)).toBeNull();
    expect(userB.customerRepository.findById(customerA.id)).toBeNull();
    expect(userA.syncOutboxRepository.countPending()).toBe(0);
    expect(userB.syncOutboxRepository.countPending()).toBe(0);
  });
});

function track(instance: SyncTestInstance): SyncTestInstance {
  instances.push(instance);

  return instance;
}
