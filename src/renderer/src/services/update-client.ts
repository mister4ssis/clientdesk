import type { IpcResult } from '@shared/ipc/ipc-result';
import type { UpdateOperationResult, UpdateState } from '@shared/update/update.types';

export class ClientDeskUpdateError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ClientDeskUpdateError';
  }
}

export async function getUpdateState(): Promise<UpdateState> {
  return unwrapIpcResult(await window.clientDesk.update.getState());
}

export async function checkForUpdate(): Promise<UpdateOperationResult> {
  return unwrapIpcResult(await window.clientDesk.update.check());
}

export async function downloadUpdate(): Promise<UpdateOperationResult> {
  return unwrapIpcResult(await window.clientDesk.update.download());
}

export async function installUpdate(): Promise<UpdateOperationResult> {
  return unwrapIpcResult(await window.clientDesk.update.install());
}

function unwrapIpcResult<TData>(result: IpcResult<TData>): TData {
  if (result.success) {
    return result.data;
  }

  throw new ClientDeskUpdateError(result.error.code, result.error.message, result.error.details);
}
