import type { AuthState } from '@shared/auth/auth.types';
import type { IpcResult } from '@shared/ipc/ipc-result';

export class ClientDeskAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ClientDeskAuthError';
  }
}

let pendingGetAuthState: Promise<AuthState> | null = null;

export async function getAuthState(): Promise<AuthState> {
  pendingGetAuthState ??= window.clientDesk.auth
    .getState()
    .then((result) => unwrapIpcResult(result))
    .finally(() => {
      pendingGetAuthState = null;
    });

  return pendingGetAuthState;
}

export async function signIn(email: string, password: string): Promise<AuthState> {
  return unwrapIpcResult(await window.clientDesk.auth.signIn(email, password));
}

export async function signOut(): Promise<void> {
  unwrapIpcResult(await window.clientDesk.auth.signOut());
}

export async function refreshSession(): Promise<AuthState> {
  return unwrapIpcResult(await window.clientDesk.auth.refreshSession());
}

function unwrapIpcResult<TData>(result: IpcResult<TData>): TData {
  if (result.success) {
    return result.data;
  }

  throw new ClientDeskAuthError(result.error.code, result.error.message, result.error.details);
}
