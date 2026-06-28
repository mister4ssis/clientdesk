import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseConnection } from '@main/database/database';
import { CustomerAuditRepository } from '@main/modules/audit/customer-audit.repository';
import { createMigratedMemoryDatabase } from '../../helpers/test-database';

let database: DatabaseConnection | null;
let repository: CustomerAuditRepository;

beforeEach(() => {
  database = createMigratedMemoryDatabase();
  repository = new CustomerAuditRepository(database);
});

afterEach(() => {
  database?.close();
  database = null;
});

describe('CustomerAuditRepository', () => {
  it('records and paginates customer history without values', () => {
    repository.record({
      customerId: customerId,
      operation: 'UPDATED',
      source: 'LOCAL_USER',
      changedFields: ['legalName', 'representative', 'phone'],
      userId,
      installationId,
      localVersion: '2026-06-25T10:00:00.000Z',
      remoteVersion: null,
      createdAt: '2026-06-25T10:00:00.000Z'
    });

    const result = repository.listByCustomer(customerId, { userId, limit: 10, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      customerId,
      operation: 'UPDATED',
      source: 'LOCAL_USER',
      changedFields: expect.arrayContaining(['legalName', 'representative', 'phone']),
      installationIdShort: '33333333-3333'
    });
    expect(JSON.stringify(result)).not.toContain('Maria');
    expect(JSON.stringify(result)).not.toContain('11999999999');
  });

  it('filters history by user', () => {
    repository.record(makeRecord({ userId, customerId }));
    repository.record(
      makeRecord({
        customerId,
        userId: '44444444-4444-4444-8444-444444444444'
      })
    );

    const result = repository.listByCustomer(customerId, { userId, limit: 10, offset: 0 });

    expect(result.total).toBe(1);
  });

  it('removes old records and preserves recent records', () => {
    repository.record(
      makeRecord({
        customerId,
        createdAt: '2026-01-01T00:00:00.000Z'
      })
    );
    repository.record(
      makeRecord({
        customerId,
        createdAt: '2026-06-01T00:00:00.000Z'
      })
    );

    expect(repository.deleteOlderThan('2026-03-01T00:00:00.000Z')).toBe(1);
    expect(repository.listByCustomer(customerId, { userId, limit: 10, offset: 0 }).total).toBe(1);
  });
});

const userId = '11111111-1111-4111-8111-111111111111';
const customerId = '22222222-2222-4222-8222-222222222222';
const installationId = '33333333-3333-4333-8333-333333333333';

function makeRecord(
  overrides: Partial<Parameters<CustomerAuditRepository['record']>[0]> = {}
): Parameters<CustomerAuditRepository['record']>[0] {
  return {
    customerId,
    operation: 'CREATED',
    source: 'LOCAL_USER',
    changedFields: ['legalName'],
    userId,
    installationId,
    localVersion: '2026-06-25T10:00:00.000Z',
    remoteVersion: null,
    createdAt: '2026-06-25T10:00:00.000Z',
    ...overrides
  };
}
