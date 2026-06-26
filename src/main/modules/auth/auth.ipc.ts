import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type { AuthState, SignInInput, SignOutResult } from '@shared/auth/auth.types';
import { signInInputSchema } from '@shared/auth/auth.schemas';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { createIpcHandler } from '../../ipc/ipc-error-handler';
import type { AuthService } from './auth.service';

type IpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>;

export type AuthServiceContract = Pick<
  AuthService,
  'getState' | 'signInWithPassword' | 'signOut' | 'refreshSession'
>;

interface RegisterAuthIpcHandlersDependencies {
  ipcMain: IpcMainLike;
  authService: AuthServiceContract;
}

export function registerAuthIpcHandlers({
  ipcMain,
  authService
}: RegisterAuthIpcHandlersDependencies): void {
  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.auth.getState,
    createIpcHandler<AuthState>(IPC_CHANNELS.auth.getState, () => authService.getState())
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.auth.signIn,
    createIpcHandler<AuthState>(IPC_CHANNELS.auth.signIn, async (_event, input: unknown) => {
      const parsedInput: SignInInput = signInInputSchema.parse(input);

      return authService.signInWithPassword(parsedInput);
    })
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.auth.signOut,
    createIpcHandler<SignOutResult>(IPC_CHANNELS.auth.signOut, async () => {
      await authService.signOut();

      return { success: true };
    })
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.auth.refreshSession,
    createIpcHandler<AuthState>(IPC_CHANNELS.auth.refreshSession, () =>
      authService.refreshSession()
    )
  );
}

type AuthIpcHandler = (
  event: IpcMainInvokeEvent,
  input?: unknown
) => Promise<unknown>;

function replaceIpcHandler(ipcMain: IpcMainLike, channel: string, handler: AuthIpcHandler): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}
