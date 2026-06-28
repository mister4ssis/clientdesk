import type {
  DiagnosticsExportResultDto,
  DiagnosticsSummaryDto,
  SyncRunLogDto,
  SyncRunLogFiltersDto
} from '@shared/diagnostics/diagnostics.types';
import type { IpcResult } from '@shared/ipc/ipc-result';

export class ClientDeskDiagnosticsError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ClientDeskDiagnosticsError';
  }
}

export async function getDiagnosticsSummary(): Promise<DiagnosticsSummaryDto> {
  return unwrapIpcResult(await window.clientDesk.diagnostics.getSummary());
}

export async function listSyncRuns(
  filters: SyncRunLogFiltersDto = {}
): Promise<SyncRunLogDto[]> {
  return unwrapIpcResult(await window.clientDesk.diagnostics.listSyncRuns(filters));
}

export async function exportDiagnostics(): Promise<DiagnosticsExportResultDto> {
  return unwrapIpcResult(await window.clientDesk.diagnostics.export());
}

function unwrapIpcResult<TData>(result: IpcResult<TData>): TData {
  if (result.success) {
    return result.data;
  }

  throw new ClientDeskDiagnosticsError(
    result.error.code,
    result.error.message,
    result.error.details
  );
}
