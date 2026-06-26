import { describe, expect, it, vi } from 'vitest';
import { registerAuthIpcHandlers } from '@main/modules/auth/auth.ipc';
import { ApplicationError } from '@main/errors/application-error';
import { ErrorCode } from '@main/errors/error-codes';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';

describe('auth IPC handlers', () => {
  it('registers auth channels and returns public auth state', async () => {
    const ipcMain = createMockIpcMain();
    const authService = {
      getState: vi.fn(() => authState),
      signInWithPassword: vi.fn(async () => authState),
      signOut: vi.fn(async () => undefined),
      refreshSession: vi.fn(async () => authState)
    };

    registerAuthIpcHandlers({ ipcMain, authService });

    await expect(ipcMain.invoke(IPC_CHANNELS.auth.getState)).resolves.toMatchObject({
      success: true,
      data: authState
    });
    await expect(
      ipcMain.invoke(IPC_CHANNELS.auth.signIn, {
        email: 'user@example.com',
        password: 'secret'
      })
    ).resolves.toMatchObject({
      success: true,
      data: authState
    });
    expect(JSON.stringify(await ipcMain.invoke(IPC_CHANNELS.auth.getState))).not.toContain('token');
  });

  it('sanitizes invalid login errors', async () => {
    const ipcMain = createMockIpcMain();
    const authService = {
      getState: vi.fn(() => authState),
      signInWithPassword: vi.fn(async () => {
        throw new ApplicationError(ErrorCode.AuthInvalidCredentials, 'raw auth message');
      }),
      signOut: vi.fn(async () => undefined),
      refreshSession: vi.fn(async () => authState)
    };

    registerAuthIpcHandlers({ ipcMain, authService });

    await expect(
      ipcMain.invoke(IPC_CHANNELS.auth.signIn, {
        email: 'user@example.com',
        password: 'wrong'
      })
    ).resolves.toMatchObject({
      success: false,
      error: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'E-mail ou senha inválidos.'
      }
    });
  });
});

const authState = {
  status: 'AUTHENTICATED' as const,
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'user@example.com'
  },
  canUseLocalData: true,
  canSynchronize: true
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
    invoke: async (channel: string, input?: unknown) => {
      const handler = handlers.get(channel);

      if (!handler) {
        throw new Error(`Missing handler: ${channel}`);
      }

      return handler({}, input);
    }
  };
}
