import Database from 'better-sqlite3';
import path from 'node:path';
import { configureDatabase, type DatabaseConnection } from '@main/database/database';
import { runMigrations } from '@main/database/migration-runner';
import type { ClientDeskSupabaseClient } from '@main/integrations/supabase/supabase-client';
import type { SupabaseConnectivityService } from '@main/integrations/supabase/supabase-connectivity.service';
import type { SupabaseSyncConfig } from '@main/integrations/supabase/supabase-config';
import type {
  RemoteCustomerRow,
  RemoteCustomerRpcPayload,
  RemoteCustomerSyncResult
} from '@main/integrations/supabase/database.types';
import { CustomerRepository } from '@main/modules/customers/customer.repository';
import { BackgroundSyncService } from '@main/modules/sync/background-sync.service';
import { CustomerConflictService } from '@main/modules/sync/customer-conflict.service';
import { CustomerPullService } from '@main/modules/sync/customer-pull.service';
import { CustomerSyncService } from '@main/modules/sync/customer-sync.service';
import {
  CUSTOMERS_CURSOR_SCOPE,
  SyncCursorRepository
} from '@main/modules/sync/sync-cursor.repository';
import { SyncConflictRepository } from '@main/modules/sync/sync-conflict.repository';
import type { SyncOutboxItem } from '@main/modules/sync/sync-outbox.repository';
import { SyncOutboxRepository } from '@main/modules/sync/sync-outbox.repository';
import { SyncStatusService } from '@main/modules/sync/sync-status.service';
import type { Customer } from '@shared/customers/customer.types';
import type { ConnectivityStatus } from '@shared/sync/sync.types';

export const sameUserId = '11111111-1111-4111-8111-111111111111';
export const otherUserId = '22222222-2222-4222-8222-222222222222';

export interface SyncTestInstance {
  database: DatabaseConnection;
  customerRepository: CustomerRepository;
  syncOutboxRepository: SyncOutboxRepository;
  syncCursorRepository: SyncCursorRepository;
  syncConflictRepository: SyncConflictRepository;
  customerConflictService: CustomerConflictService;
  backgroundSyncService: BackgroundSyncService;
  setConnectivity(connectivity: ConnectivityStatus): void;
  sync(): Promise<void>;
  close(): void;
}

interface CreateInstanceOptions {
  databasePath?: string;
  userId?: string;
  connectivity?: ConnectivityStatus;
  pullBatchSize?: number;
}

export class RemoteCustomersMock {
  private rows = new Map<string, RemoteCustomerRow>();
  private clockMs = Date.parse('2026-06-24T10:00:00.000Z');
  private nextQueryErrorCode: string | null = null;
  private nextRpcErrorCode: string | null = null;

  constructor(private readonly userId = sameUserId) {}

  createClient(userId = this.userId): ClientDeskSupabaseClient {
    return {
      rpc: async (name: string, args: unknown) => this.rpc(name, args, userId),
      from: (tableName: string) => new RemoteCustomersQuery(this, tableName, userId)
    } as unknown as ClientDeskSupabaseClient;
  }

  failNextQuery(code = 'NETWORK'): void {
    this.nextQueryErrorCode = code;
  }

  failNextRpc(code = 'NETWORK'): void {
    this.nextRpcErrorCode = code;
  }

  directUpsert(row: RemoteCustomerRow): void {
    this.rows.set(row.id, { ...row });
  }

  get(id: string): RemoteCustomerRow | null {
    const row = this.rows.get(id);

    return row ? { ...row } : null;
  }

  countForUser(userId: string): number {
    return this.getRowsForUser(userId).length;
  }

  queryRows(input: {
    userId: string;
    limit: number;
    cursorUpdatedAt: string | null;
    cursorId: string | null;
  }): { data: RemoteCustomerRow[] | null; error: RemoteError | null } {
    if (this.nextQueryErrorCode) {
      const code = this.nextQueryErrorCode;
      this.nextQueryErrorCode = null;

      return {
        data: null,
        error: { code, message: 'Remote query failed.' }
      };
    }

    const rows = this.getRowsForUser(input.userId)
      .filter((row) => isAfterCursor(row, input.cursorUpdatedAt, input.cursorId))
      .sort(compareRemoteRows)
      .slice(0, input.limit)
      .map((row) => ({ ...row }));

    return {
      data: rows,
      error: null
    };
  }

  private async rpc(
    name: string,
    args: unknown,
    userId: string
  ): Promise<{ data: RemoteCustomerSyncResult[] | null; error: RemoteError | null }> {
    if (name !== 'sync_upsert_customer') {
      return {
        data: null,
        error: { code: 'PGRST404', message: 'Unknown RPC.' }
      };
    }

    if (this.nextRpcErrorCode) {
      const code = this.nextRpcErrorCode;
      this.nextRpcErrorCode = null;

      return {
        data: null,
        error: { code, message: 'Remote RPC failed.' }
      };
    }

    const { customer_data: customerData, expected_version: expectedVersion } =
      args as {
        customer_data: TestRemoteCustomerPayload;
        expected_version: number | null;
      };
    const existing = this.rows.get(customerData.id);

    if (existing && existing.user_id !== userId) {
      return {
        data: null,
        error: { code: '42501', message: 'Forbidden.' }
      };
    }

    const duplicateTaxId = this.getRowsForUser(userId).find(
      (row) =>
        row.id !== customerData.id &&
        row.tax_id !== null &&
        row.tax_id === customerData.tax_id
    );

    if (duplicateTaxId) {
      return {
        data: null,
        error: { code: '23505', message: 'Duplicate tax id.' }
      };
    }

    if (!existing) {
      const inserted = this.toRemoteRow(customerData, {
        userId,
        version: 1,
        updatedAt: this.nextTimestamp()
      });
      this.rows.set(inserted.id, inserted);

      return {
        data: [this.toRpcResult(inserted)],
        error: null
      };
    }

    if (expectedVersion === null || existing.version !== expectedVersion) {
      return {
        data: [
          {
            result: 'CONFLICT',
            remote_version: existing.version,
            remote_updated_at: existing.updated_at,
            remote_customer: { ...existing }
          }
        ],
        error: null
      };
    }

    const updated = this.toRemoteRow(customerData, {
      userId,
      version: existing.version + 1,
      updatedAt: this.nextTimestamp()
    });
    this.rows.set(updated.id, updated);

    return {
      data: [this.toRpcResult(updated)],
      error: null
    };
  }

  private toRemoteRow(
    customerData: TestRemoteCustomerPayload,
    options: {
      userId: string;
      version: number;
      updatedAt: string;
    }
  ): RemoteCustomerRow {
    return {
      id: customerData.id,
      user_id: options.userId,
      person_type: customerData.person_type,
      legal_name: customerData.legal_name,
      trade_name: customerData.trade_name,
      representative: customerData.representative,
      tax_id: customerData.tax_id,
      email: customerData.email,
      phone: customerData.phone,
      birth_date: customerData.birth_date,
      postal_code: customerData.postal_code,
      street: customerData.street,
      address_number: customerData.address_number,
      address_complement: customerData.address_complement,
      neighborhood: customerData.neighborhood,
      city: customerData.city,
      state: customerData.state,
      notes: customerData.notes,
      active: customerData.active,
      version: options.version,
      created_at: customerData.created_at,
      deleted_at: customerData.deleted_at,
      updated_at: options.updatedAt
    };
  }

  private toRpcResult(row: RemoteCustomerRow): RemoteCustomerSyncResult {
    return {
      result: 'UPSERTED',
      remote_version: row.version,
      remote_updated_at: row.updated_at,
      remote_customer: { ...row }
    };
  }

  private getRowsForUser(userId: string): RemoteCustomerRow[] {
    return Array.from(this.rows.values()).filter((row) => row.user_id === userId);
  }

  private nextTimestamp(): string {
    this.clockMs += 1000;

    return new Date(this.clockMs).toISOString();
  }
}

type RemoteError = {
  code: string;
  message: string;
};

type TestRemoteCustomerPayload = RemoteCustomerRpcPayload &
  Pick<
    RemoteCustomerRow,
    | 'id'
    | 'person_type'
    | 'legal_name'
    | 'trade_name'
    | 'representative'
    | 'tax_id'
    | 'email'
    | 'phone'
    | 'birth_date'
    | 'postal_code'
    | 'street'
    | 'address_number'
    | 'address_complement'
    | 'neighborhood'
    | 'city'
    | 'state'
    | 'notes'
    | 'active'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at'
  >;

class RemoteCustomersQuery {
  private limitValue = 100;
  private cursorUpdatedAt: string | null = null;
  private cursorId: string | null = null;

  constructor(
    private readonly remote: RemoteCustomersMock,
    private readonly tableName: string,
    private readonly userId: string
  ) {}

  select(): this {
    return this;
  }

  order(): this {
    return this;
  }

  limit(limit: number): this {
    this.limitValue = limit;

    return this;
  }

  or(filter: string): this {
    const match = filter.match(/^updated_at\.gt\.([^,]+),and\(updated_at\.eq\.([^,]+),id\.gt\.([^)]+)\)$/);

    if (match) {
      this.cursorUpdatedAt = match[1];
      this.cursorId = match[3];
    }

    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute(): QueryResult {
    if (this.tableName !== 'customers') {
      return {
        data: null,
        error: { code: 'PGRST404', message: 'Unknown table.' }
      };
    }

    return this.remote.queryRows({
      userId: this.userId,
      limit: this.limitValue,
      cursorUpdatedAt: this.cursorUpdatedAt,
      cursorId: this.cursorId
    });
  }
}

type QueryResult = {
  data: RemoteCustomerRow[] | null;
  error: RemoteError | null;
};

export function createSyncTestInstance(
  remote: RemoteCustomersMock,
  options: CreateInstanceOptions = {}
): SyncTestInstance {
  let connectivity = options.connectivity ?? 'ONLINE';
  const database = createMigratedDatabase(options.databasePath);
  const syncOutboxRepository = new SyncOutboxRepository(database);
  const customerRepository = new CustomerRepository(database, { syncOutboxRepository });
  const syncCursorRepository = new SyncCursorRepository(database);
  const syncConflictRepository = new SyncConflictRepository(database);
  const supabaseClient = remote.createClient(options.userId ?? sameUserId);
  const config: SupabaseSyncConfig = {
    enabled: true,
    pullEnabled: true,
    url: 'https://example.supabase.co',
    publishableKey: 'publishable-key',
    intervalMinutes: 5,
    batchSize: 50,
    pullBatchSize: options.pullBatchSize ?? 100,
    requestTimeoutMs: 10000,
    hasForbiddenSecret: false
  };
  const customerSyncService = new CustomerSyncService(
    database,
    customerRepository,
    syncOutboxRepository,
    supabaseClient,
    syncConflictRepository
  );
  const customerPullService = new CustomerPullService(
    config,
    supabaseClient,
    customerRepository,
    syncOutboxRepository,
    syncCursorRepository,
    syncConflictRepository
  );
  const syncStatusService = new SyncStatusService(true, syncOutboxRepository, {
    pullEnabled: true,
    syncConflictRepository
  });
  const connectivityService = {
    check: async () => connectivity
  } satisfies Pick<SupabaseConnectivityService, 'check'>;
  const backgroundSyncService = new BackgroundSyncService(
    config,
    connectivityService as SupabaseConnectivityService,
    syncOutboxRepository,
    customerSyncService,
    syncStatusService,
    customerPullService,
    { canSynchronize: () => true }
  );
  const customerConflictService = new CustomerConflictService(
    database,
    customerRepository,
    syncOutboxRepository,
    syncConflictRepository,
    customerSyncService
  );

  return {
    database,
    customerRepository,
    syncOutboxRepository,
    syncCursorRepository,
    syncConflictRepository,
    customerConflictService,
    backgroundSyncService,
    setConnectivity(nextConnectivity) {
      connectivity = nextConnectivity;
    },
    async sync() {
      await backgroundSyncService.runNow();
    },
    close() {
      if (database.open) {
        database.close();
      }
    }
  };
}

export function createCustomer(overrides: Partial<Customer> = {}): Customer {
  const now = overrides.updatedAt ?? '2026-06-24T09:00:00.000Z';

  return {
    id: '00000000-0000-4000-8000-000000000001',
    personType: 'FISICA',
    legalName: 'Cliente Sincronizacao',
    tradeName: null,
    representative: 'Representante Teste',
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
    createdAt: overrides.createdAt ?? now,
    updatedAt: now,
    ...overrides
  };
}

export function createRemoteCustomer(overrides: Partial<RemoteCustomerRow> = {}): RemoteCustomerRow {
  const now = overrides.updated_at ?? '2026-06-24T10:00:00.000Z';

  return {
    id: '00000000-0000-4000-8000-000000000001',
    user_id: sameUserId,
    person_type: 'FISICA',
    legal_name: 'Cliente Remoto',
    trade_name: null,
    representative: 'Representante Remoto',
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
    version: 1,
    deleted_at: null,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

export function getOutboxItems(instance: SyncTestInstance): SyncOutboxItem[] {
  return instance.syncOutboxRepository.getPendingBatch(
    100,
    '2999-01-01T00:00:00.000Z'
  );
}

export function getCursor(instance: SyncTestInstance) {
  return instance.syncCursorRepository.get(CUSTOMERS_CURSOR_SCOPE);
}

export function createDatabasePath(tempDirectory: string, name: string): string {
  return path.join(tempDirectory, `${name}.sqlite`);
}

function createMigratedDatabase(databasePath?: string): DatabaseConnection {
  const database = new Database(databasePath ?? ':memory:');
  configureDatabase(database);
  runMigrations(database, {
    migrationsDirectory: path.resolve('src/main/database/migrations'),
    executedAt: () => '2026-06-24T00:00:00.000Z'
  });

  return database;
}

function compareRemoteRows(left: RemoteCustomerRow, right: RemoteCustomerRow): number {
  const updatedAtComparison = left.updated_at.localeCompare(right.updated_at);

  return updatedAtComparison === 0 ? left.id.localeCompare(right.id) : updatedAtComparison;
}

function isAfterCursor(
  row: RemoteCustomerRow,
  cursorUpdatedAt: string | null,
  cursorId: string | null
): boolean {
  if (!cursorUpdatedAt || !cursorId) {
    return true;
  }

  return row.updated_at > cursorUpdatedAt || (
    row.updated_at === cursorUpdatedAt && row.id > cursorId
  );
}
