import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupSettingsPage } from '@renderer/pages/settings/BackupSettingsPage';
import { ClientDeskBackupError } from '@renderer/services/backup-client';

const backupClientMock = vi.hoisted(() => ({
  createBackup: vi.fn(),
  restoreBackup: vi.fn(),
  validateBackup: vi.fn()
}));

const syncClientMock = vi.hoisted(() => ({
  getSyncStatus: vi.fn(),
  runSyncNow: vi.fn()
}));

const updateClientMock = vi.hoisted(() => ({
  getUpdateState: vi.fn()
}));

vi.mock('@renderer/services/backup-client', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/backup-client')>(
    '@renderer/services/backup-client'
  );

  return {
    ...actual,
    createBackup: backupClientMock.createBackup,
    restoreBackup: backupClientMock.restoreBackup,
    validateBackup: backupClientMock.validateBackup
  };
});

vi.mock('@renderer/services/sync-client', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/sync-client')>(
    '@renderer/services/sync-client'
  );

  return {
    ...actual,
    getSyncStatus: syncClientMock.getSyncStatus,
    runSyncNow: syncClientMock.runSyncNow
  };
});

vi.mock('@renderer/services/update-client', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/update-client')>(
    '@renderer/services/update-client'
  );

  return {
    ...actual,
    getUpdateState: updateClientMock.getUpdateState
  };
});

beforeEach(() => {
  backupClientMock.createBackup.mockReset();
  backupClientMock.restoreBackup.mockReset();
  backupClientMock.validateBackup.mockReset();
  syncClientMock.getSyncStatus.mockReset();
  syncClientMock.runSyncNow.mockReset();
  updateClientMock.getUpdateState.mockReset();
  syncClientMock.getSyncStatus.mockResolvedValue({
    enabled: false,
    pullEnabled: false,
    realtimeStatus: 'DISABLED',
    connectivity: 'DISABLED',
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
  });
  updateClientMock.getUpdateState.mockResolvedValue({
    status: 'DISABLED',
    currentVersion: '0.1.0',
    availableVersion: null,
    downloadPercent: null,
    lastCheckedAt: null,
    errorCode: null
  });
});

describe('BackupSettingsPage', () => {
  it('renders backup and restore sections', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Backup e restauração' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Criar backup' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Restaurar backup' })).toBeInTheDocument();
    expect(await screen.findByText('Sincronização desabilitada')).toBeInTheDocument();
  });

  it('creates backup and shows success', async () => {
    backupClientMock.createBackup.mockResolvedValue({
      success: true,
      fileName: 'backup.sqlite'
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Escolher local e criar backup' }));

    expect(await screen.findByText('Backup criado com sucesso: backup.sqlite')).toBeInTheDocument();
    expect(backupClientMock.createBackup).toHaveBeenCalledOnce();
  });

  it('shows backup cancellation without error', async () => {
    backupClientMock.createBackup.mockResolvedValue({ success: false });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Escolher local e criar backup' }));

    expect(await screen.findByText('Criação de backup cancelada.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows backup errors', async () => {
    backupClientMock.createBackup.mockRejectedValue(
      new ClientDeskBackupError('BACKUP_CREATE_FAILED', 'technical')
    );

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Escolher local e criar backup' }));

    expect(await screen.findByText('Não foi possível criar o backup.')).toBeInTheDocument();
    expect(screen.queryByText('technical')).not.toBeInTheDocument();
  });

  it('validates backup successfully', async () => {
    backupClientMock.validateBackup.mockResolvedValue({ valid: true, version: 1 });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Validar backup' }));

    expect(await screen.findByText('Backup válido. Versão das migrations: 1.')).toBeInTheDocument();
  });

  it('shows invalid backup validation', async () => {
    backupClientMock.validateBackup.mockResolvedValue({
      valid: false,
      reason: 'Arquivo vazio.'
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Validar backup' }));

    expect(await screen.findByText('Backup inválido: Arquivo vazio.')).toBeInTheDocument();
  });

  it('opens and cancels restore confirmation', async () => {
    renderPage();
    await screen.findByText('Sincronização desabilitada');

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar backup' }));
    expect(screen.getByRole('dialog', { name: 'Restaurar backup' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(backupClientMock.restoreBackup).not.toHaveBeenCalled();
  });

  it('confirms restoration and notifies completion', async () => {
    const onRestoreCompleted = vi.fn();
    backupClientMock.restoreBackup.mockResolvedValue({ success: true });

    renderPage({ onRestoreCompleted });

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar backup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar restauração' }));

    await waitFor(() => expect(backupClientMock.restoreBackup).toHaveBeenCalledOnce());
    expect(onRestoreCompleted).toHaveBeenCalledOnce();
  });

  it('shows restore cancellation without error', async () => {
    backupClientMock.restoreBackup.mockResolvedValue({ success: false });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar backup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar restauração' }));

    expect(await screen.findByText('Restauração cancelada.')).toBeInTheDocument();
  });

  it('shows restore errors', async () => {
    backupClientMock.restoreBackup.mockRejectedValue(
      new ClientDeskBackupError('BACKUP_INVALID_FILE', 'technical')
    );

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar backup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar restauração' }));

    expect(
      await screen.findByText('O arquivo selecionado não é um backup válido do ClientDesk.')
    ).toBeInTheDocument();
    expect(screen.queryByText('technical')).not.toBeInTheDocument();
  });

  it('disables buttons during backup operation', async () => {
    let resolveBackup: (value: { success: boolean }) => void = () => undefined;
    backupClientMock.createBackup.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBackup = resolve;
        })
    );

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Escolher local e criar backup' }));

    expect(screen.getByRole('button', { name: 'Criando backup...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Selecionar backup' })).toBeDisabled();

    resolveBackup({ success: false });
    expect(await screen.findByText('Criação de backup cancelada.')).toBeInTheDocument();
  });
});

function renderPage({
  onRestoreCompleted = vi.fn(),
  onViewSyncConflicts = vi.fn(),
  onViewDiagnostics = vi.fn()
}: {
  onRestoreCompleted?: () => void;
  onViewSyncConflicts?: () => void;
  onViewDiagnostics?: () => void;
} = {}) {
  return render(
    <BackupSettingsPage
      onRestoreCompleted={onRestoreCompleted}
      onViewSyncConflicts={onViewSyncConflicts}
      onViewDiagnostics={onViewDiagnostics}
    />
  );
}
