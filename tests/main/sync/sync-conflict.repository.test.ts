import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseConnection } from '@main/database/database';
import { SyncConflictRepository } from '@main/modules/sync/sync-conflict.repository';
import type { CustomerConflictSnapshot } from '@shared/sync/sync.types';
import { createMigratedMemoryDatabase } from '../../helpers/test-database';

let database: DatabaseConnection | null;
let repository: SyncConflictRepository;

beforeEach(() => {
  database = createMigratedMemoryDatabase();
  repository = new SyncConflictRepository(database);
});

afterEach(() => {
  if (database?.open) {
    database.close();
  }

  database = null;
});

describe('SyncConflictRepository', () => {
  it('creates and lists a pending customer conflict', () => {
    const conflict = repository.upsertCustomerConflict({
      entityId: customerId,
      localData: makeSnapshot({ legalName: 'Cliente Local' }),
      remoteData: makeSnapshot({ legalName: 'Cliente Remoto', remoteVersion: 2 }),
      localUpdatedAt: '2026-06-23T10:00:00.000Z',
      remoteUpdatedAt: '2026-06-23T10:01:00.000Z',
      remoteVersion: 2,
      now: '2026-06-23T10:02:00.000Z'
    });

    expect(conflict.customerName).toBe('Cliente Local');
    expect(repository.countPending()).toBe(1);
    expect(repository.listPending()).toHaveLength(1);
    expect(repository.findPendingById(conflict.id)).toMatchObject({
      entityId: customerId,
      remoteVersion: 2
    });
  });

  it('coalesces repeated pending conflicts for the same customer', () => {
    repository.upsertCustomerConflict({
      entityId: customerId,
      localData: makeSnapshot({ legalName: 'Cliente Local 1' }),
      remoteData: makeSnapshot({ legalName: 'Cliente Remoto 1', remoteVersion: 2 }),
      localUpdatedAt: '2026-06-23T10:00:00.000Z',
      remoteUpdatedAt: '2026-06-23T10:01:00.000Z',
      remoteVersion: 2
    });
    repository.upsertCustomerConflict({
      entityId: customerId,
      localData: makeSnapshot({ legalName: 'Cliente Local 2' }),
      remoteData: makeSnapshot({ legalName: 'Cliente Remoto 2', remoteVersion: 3 }),
      localUpdatedAt: '2026-06-23T10:05:00.000Z',
      remoteUpdatedAt: '2026-06-23T10:06:00.000Z',
      remoteVersion: 3
    });

    const conflicts = repository.listPending();

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      customerName: 'Cliente Local 2',
      remoteVersion: 3
    });
  });

  it('marks a pending conflict as resolved', () => {
    const conflict = repository.upsertCustomerConflict({
      entityId: customerId,
      localData: makeSnapshot({ legalName: 'Cliente Local' }),
      remoteData: makeSnapshot({ legalName: 'Cliente Remoto', remoteVersion: 2 }),
      localUpdatedAt: '2026-06-23T10:00:00.000Z',
      remoteUpdatedAt: '2026-06-23T10:01:00.000Z',
      remoteVersion: 2
    });

    repository.markResolved(
      conflict.id,
      'RESOLVED_REMOTE',
      '2026-06-23T10:03:00.000Z'
    );

    expect(repository.countPending()).toBe(0);
    expect(repository.findPendingById(conflict.id)).toBeNull();
  });
});

const customerId = '00000000-0000-4000-8000-000000000001';

function makeSnapshot(
  overrides: Partial<CustomerConflictSnapshot> = {}
): CustomerConflictSnapshot {
  return {
    id: customerId,
    personType: 'FISICA',
    legalName: 'Cliente Teste',
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
    remoteVersion: 1,
    remoteUpdatedAt: '2026-06-23T09:00:00.000Z',
    deletedAt: null,
    ...overrides
  };
}
