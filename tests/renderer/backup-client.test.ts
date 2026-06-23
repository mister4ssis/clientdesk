import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientDeskApi } from '@shared/ipc/ipc-contracts';
import {
  ClientDeskBackupError,
  createBackup,
  restoreBackup,
  validateBackup
} from '@renderer/services/backup-client';

let backupApi: ClientDeskApi['backup'];

beforeEach(() => {
  backupApi = {
    create: vi.fn(),
    restore: vi.fn(),
    validate: vi.fn()
  };

  vi.stubGlobal('window', {
    clientDesk: {
      app: {
        getVersion: vi.fn()
      },
      customers: {
        create: vi.fn(),
        list: vi.fn(),
        getById: vi.fn(),
        update: vi.fn(),
        setActive: vi.fn()
      },
      backup: backupApi
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('renderer backup client', () => {
  it('returns backup data on success', async () => {
    vi.mocked(backupApi.create).mockResolvedValue({
      success: true,
      data: {
        success: true,
        fileName: 'backup.sqlite'
      }
    });

    await expect(createBackup()).resolves.toEqual({
      success: true,
      fileName: 'backup.sqlite'
    });
    expect(backupApi.create).toHaveBeenCalledOnce();
  });

  it('throws ClientDeskBackupError on public error', async () => {
    vi.mocked(backupApi.restore).mockResolvedValue({
      success: false,
      error: {
        code: 'BACKUP_INVALID_FILE',
        message: 'O arquivo selecionado não é um backup válido do ClientDesk.'
      }
    });

    await expect(restoreBackup()).rejects.toMatchObject({
      code: 'BACKUP_INVALID_FILE',
      message: 'O arquivo selecionado não é um backup válido do ClientDesk.'
    } satisfies Partial<ClientDeskBackupError>);
  });

  it('calls the expected backup methods', async () => {
    vi.mocked(backupApi.create).mockResolvedValue({ success: true, data: { success: false } });
    vi.mocked(backupApi.restore).mockResolvedValue({ success: true, data: { success: false } });
    vi.mocked(backupApi.validate).mockResolvedValue({ success: true, data: { valid: true } });

    await createBackup();
    await restoreBackup();
    await validateBackup();

    expect(backupApi.create).toHaveBeenCalledOnce();
    expect(backupApi.restore).toHaveBeenCalledOnce();
    expect(backupApi.validate).toHaveBeenCalledOnce();
  });
});
