import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupSettingsPage } from '@renderer/pages/settings/BackupSettingsPage';
import { ClientDeskBackupError } from '@renderer/services/backup-client';

const backupClientMock = vi.hoisted(() => ({
  createBackup: vi.fn(),
  restoreBackup: vi.fn(),
  validateBackup: vi.fn()
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

beforeEach(() => {
  backupClientMock.createBackup.mockReset();
  backupClientMock.restoreBackup.mockReset();
  backupClientMock.validateBackup.mockReset();
});

describe('BackupSettingsPage', () => {
  it('renders backup and restore sections', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Backup e restauração' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Criar backup' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Restaurar backup' })).toBeInTheDocument();
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

  it('opens and cancels restore confirmation', () => {
    renderPage();

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
  onRestoreCompleted = vi.fn()
}: {
  onRestoreCompleted?: () => void;
} = {}) {
  return render(<BackupSettingsPage onRestoreCompleted={onRestoreCompleted} />);
}
