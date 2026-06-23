import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseConnection } from '@main/database/database';
import { CustomerRepository } from '@main/modules/customers/customer.repository';
import { SyncOutboxRepository } from '@main/modules/sync/sync-outbox.repository';
import type { Customer } from '@shared/customers/customer.types';
import { createMigratedMemoryDatabase } from '../../helpers/test-database';

let database: DatabaseConnection | null;
let customerRepository: CustomerRepository;
let syncOutboxRepository: SyncOutboxRepository;

beforeEach(() => {
  database = createMigratedMemoryDatabase();
  syncOutboxRepository = new SyncOutboxRepository(database);
  customerRepository = new CustomerRepository(database, { syncOutboxRepository });
});

afterEach(() => {
  if (database?.open) {
    database.close();
  }

  database = null;
});

describe('SyncOutboxRepository', () => {
  it('enqueues customer creation inside the local write path', () => {
    customerRepository.create(makeCustomer({ id: 'customer-1' }));

    expect(syncOutboxRepository.countPending()).toBe(1);
    expect(syncOutboxRepository.getPendingBatch(10, now)).toMatchObject([
      {
        entityType: 'CUSTOMER',
        entityId: 'customer-1',
        operation: 'UPSERT'
      }
    ]);
  });

  it('coalesces several changes for the same customer', () => {
    customerRepository.create(makeCustomer({ id: 'customer-1' }));
    customerRepository.update('customer-1', {
      legalName: 'Maria Souza',
      updatedAt: '2026-06-21T11:00:00.000Z'
    });
    customerRepository.setActive('customer-1', false, '2026-06-21T12:00:00.000Z');

    expect(syncOutboxRepository.countPending()).toBe(1);
    expect(syncOutboxRepository.getPendingBatch(10, now)[0]).toMatchObject({
      entityId: 'customer-1'
    });
  });

  it('respects next_attempt_at when fetching pending batches', () => {
    customerRepository.create(makeCustomer({ id: 'customer-1' }));
    const item = syncOutboxRepository.getPendingBatch(10, now)[0];

    expect(item).toBeDefined();
    syncOutboxRepository.markAttemptFailed(
      item.id,
      'SYNC_NETWORK_UNAVAILABLE',
      '2026-06-21T12:00:00.000Z',
      now
    );

    expect(syncOutboxRepository.getPendingBatch(10, '2026-06-21T11:00:00.000Z')).toHaveLength(0);
    expect(syncOutboxRepository.getPendingBatch(10, '2026-06-21T12:00:00.000Z')).toHaveLength(1);
  });

  it('bootstraps pending customers idempotently', () => {
    new CustomerRepository(database!).create(makeCustomer({ id: 'customer-1' }));

    syncOutboxRepository.bootstrapPendingCustomers(now);
    syncOutboxRepository.bootstrapPendingCustomers(now);

    expect(syncOutboxRepository.countPending()).toBe(1);
  });
});

const now = '2026-06-21T10:00:00.000Z';

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'customer-1',
    personType: 'FISICA',
    legalName: 'Maria Silva',
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
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}
