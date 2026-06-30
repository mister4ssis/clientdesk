import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseConnection } from '@main/database/database';
import type { ClientDeskSupabaseClient } from '@main/integrations/supabase/supabase-client';
import type { SupabaseSyncConfig } from '@main/integrations/supabase/supabase-config';
import type { RemoteCustomerRow } from '@main/integrations/supabase/database.types';
import { CustomerRepository } from '@main/modules/customers/customer.repository';
import { CustomerPullService } from '@main/modules/sync/customer-pull.service';
import { CUSTOMERS_CURSOR_SCOPE, SyncCursorRepository } from '@main/modules/sync/sync-cursor.repository';
import { SyncConflictRepository } from '@main/modules/sync/sync-conflict.repository';
import { SyncOutboxRepository } from '@main/modules/sync/sync-outbox.repository';
import type { Customer } from '@shared/customers/customer.types';
import { createMigratedMemoryDatabase } from '../../helpers/test-database';

let database: DatabaseConnection | null;
let customerRepository: CustomerRepository;
let syncOutboxRepository: SyncOutboxRepository;
let syncCursorRepository: SyncCursorRepository;
let syncConflictRepository: SyncConflictRepository;

beforeEach(() => {
  database = createMigratedMemoryDatabase();
  syncOutboxRepository = new SyncOutboxRepository(database);
  customerRepository = new CustomerRepository(database, { syncOutboxRepository });
  syncCursorRepository = new SyncCursorRepository(database);
  syncConflictRepository = new SyncConflictRepository(database);
});

afterEach(() => {
  if (database?.open) {
    database.close();
  }

  database = null;
});

describe('CustomerPullService', () => {
  it('downloads a new remote customer without creating an outbox item', async () => {
    const remoteCustomer = makeRemoteCustomer({
      id: '00000000-0000-4000-8000-000000000010',
      legal_name: 'Cliente Remoto',
      representative: 'Representante Remoto'
    });
    const service = createService([remoteCustomer]);

    await expect(service.pullRemoteChanges()).resolves.toMatchObject({
      success: true,
      pulledCount: 1,
      conflictCount: 0
    });

    expect(customerRepository.findById(remoteCustomer.id)).toMatchObject({
      legalName: 'Cliente Remoto',
      representative: 'Representante Remoto'
    });
    expect(getCustomerSyncMetadata(remoteCustomer.id)).toMatchObject({
      syncStatus: 'SYNCED',
      remoteVersion: 1,
      remoteUpdatedAt: remoteCustomer.updated_at
    });
    expect(syncOutboxRepository.countPending()).toBe(0);
    expect(syncCursorRepository.get(CUSTOMERS_CURSOR_SCOPE)).toMatchObject({
      lastRemoteUpdatedAt: remoteCustomer.updated_at,
      lastRemoteId: remoteCustomer.id
    });
  });

  it('registers a conflict when the same customer has pending local and newer remote changes', async () => {
    const customerId = '00000000-0000-4000-8000-000000000020';
    customerRepository.create(
      makeCustomer({
        id: customerId,
        legalName: 'Cliente Local'
      })
    );
    database!
      .prepare(
        `
          UPDATE customers
          SET remote_version = 1,
              remote_updated_at = '2026-06-23T09:00:00.000Z'
          WHERE id = ?
        `
      )
      .run(customerId);

    const service = createService([
      makeRemoteCustomer({
        id: customerId,
        legal_name: 'Cliente Remoto',
        version: 2,
        updated_at: '2026-06-23T10:10:00.000Z'
      })
    ]);

    await expect(service.pullRemoteChanges()).resolves.toMatchObject({
      success: true,
      pulledCount: 0,
      conflictCount: 1
    });

    expect(customerRepository.findById(customerId)).toMatchObject({
      legalName: 'Cliente Local'
    });
    expect(getCustomerSyncMetadata(customerId)).toMatchObject({
      syncStatus: 'CONFLICT',
      syncConflict: true
    });
    expect(syncConflictRepository.countPending()).toBe(1);
    expect(syncOutboxRepository.countPending()).toBe(1);
  });
});

const config: SupabaseSyncConfig = {
  enabled: true,
  pullEnabled: true,
  url: 'https://example.supabase.co',
  publishableKey: 'publishable-key',
  intervalMinutes: 5,
  batchSize: 50,
  pullBatchSize: 100,
  realtimeEnabled: true,
  realtimePullDebounceMs: 500,
  realtimeReconnectMaxSeconds: 60,
  auditRetentionDays: 365,
  syncLogRetentionDays: 30,
  syncLogMaxRows: 1000,
  requestTimeoutMs: 10000,
  hasForbiddenSecret: false
};

function createService(rows: RemoteCustomerRow[]): CustomerPullService {
  return new CustomerPullService(
    config,
    createSupabaseClientMock(rows),
    customerRepository,
    syncOutboxRepository,
    syncCursorRepository,
    syncConflictRepository
  );
}

function getCustomerSyncMetadata(id: string) {
  const row = database!
    .prepare(
      `
        SELECT
          sync_status as syncStatus,
          remote_version as remoteVersion,
          remote_updated_at as remoteUpdatedAt,
          sync_conflict as syncConflict
        FROM customers
        WHERE id = ?
      `
    )
    .get(id) as
    | {
        syncStatus: string;
        remoteVersion: number | null;
        remoteUpdatedAt: string | null;
        syncConflict: 0 | 1;
      }
    | undefined;

  return row
    ? {
        ...row,
        syncConflict: row.syncConflict === 1
      }
    : null;
}

function createSupabaseClientMock(rows: RemoteCustomerRow[]): ClientDeskSupabaseClient {
  const query = {
    data: rows,
    error: null,
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    or: vi.fn(() => query)
  };

  return {
    from: vi.fn(() => query)
  } as unknown as ClientDeskSupabaseClient;
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: '00000000-0000-4000-8000-000000000020',
    personType: 'FISICA',
    legalName: 'Cliente Local',
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
    ...overrides
  };
}

function makeRemoteCustomer(overrides: Partial<RemoteCustomerRow> = {}): RemoteCustomerRow {
  return {
    id: '00000000-0000-4000-8000-000000000010',
    user_id: '99999999-9999-4999-8999-999999999999',
    person_type: 'FISICA',
    legal_name: 'Cliente Remoto',
    trade_name: null,
    representative: null,
    tax_id: null,
    email: null,
    phone: null,
    birth_date: null,
    postal_code: null,
    street: null,
    address_number: null,
    address_complement: null,
    neighborhood: null,
    city: null,
    state: null,
    notes: null,
    active: true,
    created_at: '2026-06-23T09:00:00.000Z',
    updated_at: '2026-06-23T10:00:00.000Z',
    version: 1,
    deleted_at: null,
    ...overrides
  };
}
