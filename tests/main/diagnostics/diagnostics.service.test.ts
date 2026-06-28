import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseConnection } from '@main/database/database';
import type { AuthService } from '@main/modules/auth/auth.service';
import { DiagnosticsService } from '@main/modules/diagnostics/diagnostics.service';
import { SyncRunLogRepository } from '@main/modules/diagnostics/sync-run-log.repository';
import type { InstallationService } from '@main/modules/installation/installation.service';
import type { BackgroundSyncService } from '@main/modules/sync/background-sync.service';
import { SyncConflictRepository } from '@main/modules/sync/sync-conflict.repository';
import { SyncCursorRepository } from '@main/modules/sync/sync-cursor.repository';
import { SyncOutboxRepository } from '@main/modules/sync/sync-outbox.repository';
import { createMigratedMemoryDatabase } from '../../helpers/test-database';

let database: DatabaseConnection | null;

beforeEach(() => {
  database = createMigratedMemoryDatabase();
});

afterEach(() => {
  database?.close();
  database = null;
});

describe('DiagnosticsService', () => {
  it('returns a sanitized summary without secrets or full email', () => {
    const service = createDiagnosticsService(database as DatabaseConnection);

    const summary = service.getSummary();
    const serialized = JSON.stringify(summary);

    expect(summary.maskedEmail).toBe('ma***@example.com');
    expect(summary.installationIdShort).toBe('33333333-333');
    expect(summary.integrityCheck).toBe('ok');
    expect(serialized).not.toContain('maria@example.com');
    expect(serialized).not.toContain('publishable-key');
    expect(serialized).not.toContain('access_token');
  });
});

function createDiagnosticsService(databaseConnection: DatabaseConnection): DiagnosticsService {
  const syncOutboxRepository = new SyncOutboxRepository(databaseConnection);
  const syncConflictRepository = new SyncConflictRepository(databaseConnection);
  const syncCursorRepository = new SyncCursorRepository(databaseConnection);
  const syncRunLogRepository = new SyncRunLogRepository(databaseConnection);

  return new DiagnosticsService({
    database: databaseConnection,
    authService: {
      getState: () => ({
        status: 'AUTHENTICATED',
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'maria@example.com'
        },
        canUseLocalData: true,
        canSynchronize: true
      })
    } as AuthService,
    syncService: {
      getStatus: () => ({
        enabled: true,
        pullEnabled: true,
        realtimeStatus: 'SUBSCRIBED',
        connectivity: 'ONLINE',
        running: false,
        direction: 'IDLE',
        pendingCount: 0,
        conflictCount: 0,
        lastStartedAt: null,
        lastCompletedAt: null,
        lastPushAt: null,
        lastPullAt: null,
        lastRealtimeEventAt: null,
        lastRealtimeConnectedAt: null,
        lastSuccessfulAt: null,
        lastErrorCode: null
      })
    } as BackgroundSyncService,
    syncOutboxRepository,
    syncConflictRepository,
    syncCursorRepository,
    syncRunLogRepository,
    installationService: {
      getShortInstallationId: () => '33333333-333'
    } as InstallationService,
    getAppVersion: () => '0.1.0'
  });
}
