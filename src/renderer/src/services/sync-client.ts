import type {
  SyncConflictDetails,
  SyncConflictSummary,
  SyncRunResult,
  SyncStatus
} from '@shared/sync/sync.types';
import type { IpcResult } from '@shared/ipc/ipc-result';

export class ClientDeskSyncError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ClientDeskSyncError';
  }
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return unwrapIpcResult(await window.clientDesk.sync.getStatus());
}

export async function runSyncNow(): Promise<SyncRunResult> {
  return unwrapIpcResult(await window.clientDesk.sync.runNow());
}

export async function listSyncConflicts(): Promise<SyncConflictSummary[]> {
  return unwrapIpcResult(await window.clientDesk.sync.listConflicts());
}

export async function getSyncConflict(id: string): Promise<SyncConflictDetails> {
  return unwrapIpcResult(await window.clientDesk.sync.getConflict(id));
}

export async function resolveSyncConflictKeepLocal(id: string): Promise<SyncConflictDetails> {
  return unwrapIpcResult(await window.clientDesk.sync.resolveKeepLocal(id));
}

export async function resolveSyncConflictUseRemote(id: string): Promise<SyncConflictDetails> {
  return unwrapIpcResult(await window.clientDesk.sync.resolveUseRemote(id));
}

function unwrapIpcResult<T>(result: IpcResult<T>): T {
  if (result.success) {
    return result.data;
  }

  throw new ClientDeskSyncError(result.error.code, result.error.message, result.error.details);
}
