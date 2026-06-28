import type { AuthState } from '../auth/auth.types';
import type { SyncStatus } from '../sync/sync.types';

export type SyncRunReason =
  | 'STARTUP'
  | 'PERIODIC'
  | 'MANUAL'
  | 'LOCAL_CHANGE'
  | 'REALTIME_EVENT'
  | 'RECONNECT';

export type SyncRunLogStatus =
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export interface SyncRunLogDto {
  id: string;
  reason: SyncRunReason;
  status: SyncRunLogStatus;
  pushProcessedCount: number;
  pullProcessedCount: number;
  conflictCount: number;
  failureCount: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorCode: string | null;
}

export interface SyncRunLogFiltersDto {
  status?: SyncRunLogStatus;
  reason?: SyncRunReason;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface DiagnosticsSummaryDto {
  appVersion: string;
  platform: string;
  arch: string;
  electronVersion: string;
  nodeVersion: string;
  schemaVersion: number | null;
  appliedMigrations: number[];
  authState: AuthState;
  maskedEmail: string | null;
  syncStatus: SyncStatus;
  outboxPendingCount: number;
  conflictCount: number;
  installationIdShort: string;
  customerCursor: {
    lastRemoteUpdatedAt: string | null;
    lastRemoteId: string | null;
  } | null;
  integrityCheck: 'ok' | 'failed';
  lastErrorCode: string | null;
}

export interface DiagnosticsExportResultDto {
  success: boolean;
  fileName?: string;
  exportedAt?: string;
}
