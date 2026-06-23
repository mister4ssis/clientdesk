import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundSyncService, calculateNextAttemptAt } from '@main/modules/sync/background-sync.service';
import type { SyncOutboxRepository } from '@main/modules/sync/sync-outbox.repository';
import type { CustomerSyncService } from '@main/modules/sync/customer-sync.service';
import type { SupabaseConnectivityService } from '@main/integrations/supabase/supabase-connectivity.service';
import { SyncStatusService } from '@main/modules/sync/sync-status.service';

describe('BackgroundSyncService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T10:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns disabled status when sync is disabled', async () => {
    const service = createService({ enabled: false });

    await expect(service.runNow()).resolves.toMatchObject({
      started: false,
      status: {
        enabled: false,
        connectivity: 'DISABLED',
        lastErrorCode: 'SYNC_DISABLED'
      }
    });
  });

  it('processes pending items and removes successful ones', async () => {
    const dependencies = createDependencies();
    const service = createService({}, dependencies);

    const result = await service.runNow();

    expect(result.started).toBe(true);
    expect(dependencies.customerSyncService.syncCustomer).toHaveBeenCalledWith(syncItem);
    expect(result.status.lastErrorCode).toBeNull();
  });

  it('keeps failed items scheduled for retry', async () => {
    const dependencies = createDependencies({
      syncResult: {
        success: false,
        errorCode: 'SYNC_NETWORK_UNAVAILABLE'
      }
    });
    const service = createService({}, dependencies);

    const result = await service.runNow();

    expect(result.status.lastErrorCode).toBe('SYNC_NETWORK_UNAVAILABLE');
    expect(dependencies.syncOutboxRepository.markAttemptFailed).toHaveBeenCalledWith(
      syncItem.id,
      'SYNC_NETWORK_UNAVAILABLE',
      '2026-06-21T10:01:00.000Z',
      '2026-06-21T10:00:00.000Z'
    );
  });

  it('calculates progressive backoff capped at 30 minutes', () => {
    const base = Date.parse('2026-06-21T10:00:00.000Z');

    expect(calculateNextAttemptAt(1, base)).toBe('2026-06-21T10:01:00.000Z');
    expect(calculateNextAttemptAt(2, base)).toBe('2026-06-21T10:02:00.000Z');
    expect(calculateNextAttemptAt(3, base)).toBe('2026-06-21T10:05:00.000Z');
    expect(calculateNextAttemptAt(4, base)).toBe('2026-06-21T10:15:00.000Z');
    expect(calculateNextAttemptAt(5, base)).toBe('2026-06-21T10:30:00.000Z');
  });
});

const syncItem = {
  id: 'outbox-1',
  entityType: 'CUSTOMER' as const,
  entityId: 'customer-1',
  operation: 'UPSERT' as const,
  attempts: 0,
  nextAttemptAt: null,
  lastErrorCode: null,
  createdAt: '2026-06-21T10:00:00.000Z',
  updatedAt: '2026-06-21T10:00:00.000Z'
};

interface DependencyOptions {
  syncResult?: { success: boolean; errorCode: string | null };
}

function createDependencies(options: DependencyOptions = {}) {
  const syncOutboxRepository = {
    countPending: vi.fn(() => 1),
    getPendingBatch: vi.fn(() => [syncItem]),
    markAttemptFailed: vi.fn()
  } satisfies Pick<SyncOutboxRepository, 'countPending' | 'getPendingBatch' | 'markAttemptFailed'>;
  const customerSyncService = {
    syncCustomer: vi.fn(async () => options.syncResult ?? { success: true, errorCode: null })
  } satisfies Pick<CustomerSyncService, 'syncCustomer'>;
  const connectivityService = {
    check: vi.fn(async () => 'ONLINE' as const)
  } satisfies Pick<SupabaseConnectivityService, 'check'>;
  const syncStatusService = new SyncStatusService(
    true,
    syncOutboxRepository as unknown as SyncOutboxRepository
  );

  return {
    syncOutboxRepository,
    customerSyncService,
    connectivityService,
    syncStatusService
  };
}

function createService(
  configOverrides: Partial<ConstructorParameters<typeof BackgroundSyncService>[0]> = {},
  dependencies = createDependencies()
): BackgroundSyncService {
  return new BackgroundSyncService(
    {
      enabled: true,
      url: 'https://example.supabase.co',
      publishableKey: 'publishable-key',
      intervalMinutes: 5,
      batchSize: 50,
      requestTimeoutMs: 10000,
      hasForbiddenSecret: false,
      ...configOverrides
    },
    dependencies.connectivityService as unknown as SupabaseConnectivityService,
    dependencies.syncOutboxRepository as unknown as SyncOutboxRepository,
    dependencies.customerSyncService as unknown as CustomerSyncService,
    dependencies.syncStatusService
  );
}
