import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationError } from '@main/errors/application-error';
import { ErrorCode } from '@main/errors/error-codes';
import {
  registerBackupIpcHandlers,
  type BackupServiceContract
} from '@main/modules/backup/backup.ipc';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import type { IpcResult } from '@shared/ipc/ipc-result';

type RegisteredHandler = Parameters<IpcMain['handle']>[1];

class MockIpcMain {
  readonly handlers = new Map<string, RegisteredHandler>();
  readonly removedChannels: string[] = [];

  handle(channel: string, listener: RegisteredHandler): void {
    this.handlers.set(channel, listener);
  }

  removeHandler(channel: string): void {
    this.removedChannels.push(channel);
    this.handlers.delete(channel);
  }

  async invoke<TData>(channel: string): Promise<IpcResult<TData>> {
    const handler = this.handlers.get(channel);

    if (!handler) {
      throw new Error(`No handler registered for ${channel}.`);
    }

    return (await handler({} as IpcMainInvokeEvent)) as IpcResult<TData>;
  }
}

describe('backup IPC handlers', () => {
  it('registers all backup channels', () => {
    const ipcMain = new MockIpcMain();

    registerBackupIpcHandlers({
      ipcMain,
      backupService: createBackupServiceMock()
    });

    expect([...ipcMain.handlers.keys()].sort()).toEqual(
      [
        IPC_CHANNELS.backup.create,
        IPC_CHANNELS.backup.restore,
        IPC_CHANNELS.backup.validate
      ].sort()
    );
    expect(ipcMain.removedChannels).toEqual(expect.arrayContaining([...ipcMain.handlers.keys()]));
  });

  it('creates backup successfully', async () => {
    const service = createBackupServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke(IPC_CHANNELS.backup.create);

    expect(result.success).toBe(true);
    expect(service.createBackup).toHaveBeenCalledOnce();
  });

  it('returns cancellation as successful IPC result', async () => {
    const ipcMain = registerMockHandlers(
      createBackupServiceMock({
        createBackup: vi.fn(async () => ({ success: false }))
      })
    );

    const result = await ipcMain.invoke(IPC_CHANNELS.backup.create);

    expect(result).toEqual({
      success: true,
      data: {
        success: false
      }
    });
  });

  it('restores backup successfully', async () => {
    const service = createBackupServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke(IPC_CHANNELS.backup.restore);

    expect(result.success).toBe(true);
    expect(service.restoreBackup).toHaveBeenCalledOnce();
  });

  it('converts invalid backup file to public error', async () => {
    const ipcMain = registerMockHandlers(
      createBackupServiceMock({
        restoreBackup: vi.fn(async () => {
          throw new ApplicationError(ErrorCode.BackupInvalidFile, '/private/path');
        })
      })
    );

    const result = await ipcMain.invoke(IPC_CHANNELS.backup.restore);
    const serialized = JSON.stringify(result);

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error).toMatchObject({
      code: ErrorCode.BackupInvalidFile,
      message: 'O arquivo selecionado não é um backup válido do ClientDesk.'
    });
    expect(serialized).not.toContain('/private/path');
  });

  it('converts operation in progress to public error', async () => {
    const ipcMain = registerMockHandlers(
      createBackupServiceMock({
        validateBackup: vi.fn(async () => {
          throw new ApplicationError(ErrorCode.BackupOperationInProgress, 'internal busy');
        })
      })
    );

    const result = await ipcMain.invoke(IPC_CHANNELS.backup.validate);

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.code).toBe(
      ErrorCode.BackupOperationInProgress
    );
  });

  it('sanitizes unknown backup errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ipcMain = registerMockHandlers(
      createBackupServiceMock({
        createBackup: vi.fn(async () => {
          throw new Error('SQLITE details /private/path');
        })
      })
    );

    const result = await ipcMain.invoke(IPC_CHANNELS.backup.create);
    const serialized = JSON.stringify(result);

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.code).toBe(ErrorCode.InternalError);
    expect(serialized).not.toContain('SQLITE');
    expect(serialized).not.toContain('/private/path');

    consoleError.mockRestore();
  });
});

function registerMockHandlers(service: BackupServiceContract): MockIpcMain {
  const ipcMain = new MockIpcMain();

  registerBackupIpcHandlers({
    ipcMain,
    backupService: service
  });

  return ipcMain;
}

function createBackupServiceMock(
  overrides: Partial<BackupServiceContract> = {}
): BackupServiceContract {
  return {
    createBackup: vi.fn(async () => ({
      success: true,
      fileName: 'backup.sqlite',
      createdAt: '2026-06-22T10:00:00.000Z'
    })),
    restoreBackup: vi.fn(async () => ({
      success: true,
      restoredAt: '2026-06-22T10:00:00.000Z'
    })),
    validateBackup: vi.fn(async () => ({
      valid: true,
      version: 1
    })),
    ...overrides
  };
}
