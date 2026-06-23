import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseConnection } from '@main/database/database';
import type { ClientDeskSupabaseClient } from '@main/integrations/supabase/supabase-client';
import { CustomerRepository } from '@main/modules/customers/customer.repository';
import { CustomerSyncService } from '@main/modules/sync/customer-sync.service';
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

describe('CustomerSyncService', () => {
  it('upserts customer by local id and marks the item as synced', async () => {
    customerRepository.create(
      makeCustomer({
        id: '00000000-0000-4000-8000-000000000001',
        representative: 'Ana Souza'
      })
    );
    const item = syncOutboxRepository.getPendingBatch(10, now)[0];
    const rpc = vi.fn(async () => ({
      data: [
        {
          result: 'UPSERTED',
          remote_version: 1,
          remote_updated_at: '2026-06-21T10:01:00.000Z',
          remote_customer: null
        }
      ],
      error: null
    }));
    const supabaseClient = createSupabaseClientMock(rpc);
    const service = new CustomerSyncService(
      database!,
      customerRepository,
      syncOutboxRepository,
      supabaseClient
    );

    await expect(service.syncCustomer(item)).resolves.toEqual({
      success: true,
      errorCode: null
    });

    expect(rpc).toHaveBeenCalledWith('sync_upsert_customer', {
      customer_data: expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000001',
        representative: 'Ana Souza'
      }),
      expected_version: null
    });
    expect(syncOutboxRepository.countPending()).toBe(0);
    expect(getCustomerSyncStatus('00000000-0000-4000-8000-000000000001')).toMatchObject({
      sync_status: 'SYNCED',
      sync_error_code: null,
      remote_version: 1,
      remote_updated_at: '2026-06-21T10:01:00.000Z'
    });
  });

  it('keeps local customer pending when remote upsert fails', async () => {
    customerRepository.create(makeCustomer({ id: '00000000-0000-4000-8000-000000000002' }));
    const item = syncOutboxRepository.getPendingBatch(10, now)[0];
    const supabaseClient = createSupabaseClientMock(
      vi.fn(async () => ({
        error: {
          code: 'NETWORK',
          message: 'network failed'
        }
      }))
    );
    const service = new CustomerSyncService(
      database!,
      customerRepository,
      syncOutboxRepository,
      supabaseClient
    );

    await expect(service.syncCustomer(item)).resolves.toEqual({
      success: false,
      errorCode: 'SYNC_REMOTE_ERROR'
    });

    expect(syncOutboxRepository.countPending()).toBe(1);
    expect(getCustomerSyncStatus('00000000-0000-4000-8000-000000000002')).toMatchObject({
      sync_status: 'ERROR',
      sync_error_code: 'SYNC_REMOTE_ERROR'
    });
  });
});

const now = '2026-06-21T10:00:00.000Z';

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: '00000000-0000-4000-8000-000000000001',
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

function createSupabaseClientMock(rpc: ReturnType<typeof vi.fn>): ClientDeskSupabaseClient {
  return {
    rpc
  } as unknown as ClientDeskSupabaseClient;
}

function getCustomerSyncStatus(id: string) {
  return database!
    .prepare(
      `
        SELECT sync_status, sync_error_code, remote_version, remote_updated_at
        FROM customers
        WHERE id = ?
      `
    )
    .get(id);
}
