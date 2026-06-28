import { describe, expect, it, vi } from 'vitest';
import { registerDiagnosticsIpcHandlers } from '@main/modules/diagnostics/diagnostics.ipc';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';

describe('diagnostics IPC handlers', () => {
  it('registers explicit diagnostics channels', async () => {
    const ipcMain = createMockIpcMain();
    const diagnosticsService = {
      getSummary: vi.fn(() => diagnosticsSummary),
      listSyncRuns: vi.fn(() => [syncRun])
    };
    const diagnosticsExportService = {
      export: vi.fn(async () => ({ success: false }))
    };

    registerDiagnosticsIpcHandlers({
      ipcMain,
      diagnosticsService,
      diagnosticsExportService
    });

    expect(ipcMain.registeredChannels()).toEqual([
      IPC_CHANNELS.diagnostics.getSummary,
      IPC_CHANNELS.diagnostics.listSyncRuns,
      IPC_CHANNELS.diagnostics.export
    ]);
    await expect(ipcMain.invoke(IPC_CHANNELS.diagnostics.getSummary)).resolves.toMatchObject({
      success: true,
      data: diagnosticsSummary
    });
    await expect(
      ipcMain.invoke(IPC_CHANNELS.diagnostics.listSyncRuns, { limit: 10 })
    ).resolves.toMatchObject({
      success: true,
      data: [syncRun]
    });
    await expect(ipcMain.invoke(IPC_CHANNELS.diagnostics.export)).resolves.toMatchObject({
      success: true,
      data: {
        success: false
      }
    });
  });
});

const syncStatus = {
  enabled: true,
  pullEnabled: true,
  realtimeStatus: 'SUBSCRIBED' as const,
  connectivity: 'ONLINE' as const,
  running: false,
  direction: 'IDLE' as const,
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
};

const diagnosticsSummary = {
  appVersion: '0.1.0',
  platform: 'darwin',
  arch: 'arm64',
  electronVersion: '1.0.0',
  nodeVersion: '20.0.0',
  schemaVersion: 5,
  appliedMigrations: [1, 2, 3, 4, 5],
  authState: {
    status: 'AUTHENTICATED' as const,
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'maria@example.com'
    },
    canUseLocalData: true,
    canSynchronize: true
  },
  maskedEmail: 'ma***@example.com',
  syncStatus,
  outboxPendingCount: 0,
  conflictCount: 0,
  installationIdShort: '22222222-222',
  customerCursor: null,
  integrityCheck: 'ok' as const,
  lastErrorCode: null
};

const syncRun = {
  id: '33333333-3333-4333-8333-333333333333',
  reason: 'MANUAL' as const,
  status: 'SUCCESS' as const,
  pushProcessedCount: 1,
  pullProcessedCount: 0,
  conflictCount: 0,
  failureCount: 0,
  startedAt: '2026-06-25T10:00:00.000Z',
  completedAt: '2026-06-25T10:00:01.000Z',
  durationMs: 1000,
  errorCode: null
};

function createMockIpcMain() {
  const handlers = new Map<string, (event: unknown, input?: unknown) => unknown>();

  return {
    handle: vi.fn((channel: string, handler: (event: unknown, input?: unknown) => unknown) => {
      handlers.set(channel, handler);
    }),
    removeHandler: vi.fn((channel: string) => {
      handlers.delete(channel);
    }),
    registeredChannels: () => Array.from(handlers.keys()),
    invoke: async (channel: string, input?: unknown) => {
      const handler = handlers.get(channel);

      if (!handler) {
        throw new Error(`Missing handler: ${channel}`);
      }

      return handler({}, input);
    }
  };
}
