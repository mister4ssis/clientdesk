import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiagnosticsPage } from '@renderer/pages/settings/DiagnosticsPage';

const diagnosticsClientMock = vi.hoisted(() => ({
  getDiagnosticsSummary: vi.fn(),
  listSyncRuns: vi.fn(),
  exportDiagnostics: vi.fn()
}));
const syncClientMock = vi.hoisted(() => ({
  runSyncNow: vi.fn()
}));

vi.mock('@renderer/services/diagnostics-client', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/diagnostics-client')>(
    '@renderer/services/diagnostics-client'
  );

  return {
    ...actual,
    getDiagnosticsSummary: diagnosticsClientMock.getDiagnosticsSummary,
    listSyncRuns: diagnosticsClientMock.listSyncRuns,
    exportDiagnostics: diagnosticsClientMock.exportDiagnostics
  };
});

vi.mock('@renderer/services/sync-client', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/sync-client')>(
    '@renderer/services/sync-client'
  );

  return {
    ...actual,
    runSyncNow: syncClientMock.runSyncNow
  };
});

beforeEach(() => {
  diagnosticsClientMock.getDiagnosticsSummary.mockReset();
  diagnosticsClientMock.listSyncRuns.mockReset();
  diagnosticsClientMock.exportDiagnostics.mockReset();
  syncClientMock.runSyncNow.mockReset();
  diagnosticsClientMock.getDiagnosticsSummary.mockResolvedValue(diagnosticsSummary);
  diagnosticsClientMock.listSyncRuns.mockResolvedValue([syncRun]);
});

describe('DiagnosticsPage', () => {
  it('shows sanitized diagnostics summary and sync runs', async () => {
    render(<DiagnosticsPage onBack={vi.fn()} />);

    expect(await screen.findByText('ma***@example.com')).toBeInTheDocument();
    expect(screen.getByText('Alteração local')).toBeInTheDocument();
    expect(screen.getByText('Sucesso')).toBeInTheDocument();
    expect(screen.queryByText('maria@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('publishable-key')).not.toBeInTheDocument();
  });

  it('exports diagnostics and handles cancellation', async () => {
    diagnosticsClientMock.exportDiagnostics.mockResolvedValue({
      success: false
    });

    render(<DiagnosticsPage onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Exportar diagnóstico' }));

    expect(await screen.findByText('Exportação cancelada.')).toBeInTheDocument();
  });

  it('runs manual synchronization from diagnostics', async () => {
    syncClientMock.runSyncNow.mockResolvedValue({
      started: true,
      status: diagnosticsSummary.syncStatus
    });

    render(<DiagnosticsPage onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sincronizar agora' }));

    await waitFor(() => expect(syncClientMock.runSyncNow).toHaveBeenCalledTimes(1));
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
  reason: 'LOCAL_CHANGE' as const,
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
