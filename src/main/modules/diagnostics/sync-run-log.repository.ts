import type { DatabaseConnection } from '../../database/database';
import type {
  SyncRunLogDto,
  SyncRunLogFiltersDto,
  SyncRunLogStatus,
  SyncRunReason
} from '@shared/diagnostics/diagnostics.types';

interface SyncRunLogRow {
  id: string;
  reason: SyncRunReason;
  status: SyncRunLogStatus;
  push_processed_count: number;
  pull_processed_count: number;
  conflict_count: number;
  failure_count: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_code: string | null;
  user_id: string;
  installation_id: string;
}

export interface StartSyncRunLogInput {
  id: string;
  reason: SyncRunReason;
  startedAt: string;
  userId: string;
  installationId: string;
}

export interface CompleteSyncRunLogInput {
  id: string;
  status: SyncRunLogStatus;
  pushProcessedCount: number;
  pullProcessedCount: number;
  conflictCount: number;
  failureCount: number;
  completedAt: string;
  durationMs: number;
  errorCode: string | null;
}

export class SyncRunLogRepository {
  constructor(private readonly database: DatabaseConnection) {}

  start(input: StartSyncRunLogInput): void {
    this.database
      .prepare(
        `
          INSERT INTO sync_run_log (
            id,
            reason,
            status,
            started_at,
            user_id,
            installation_id
          )
          VALUES (
            @id,
            @reason,
            'RUNNING',
            @startedAt,
            @userId,
            @installationId
          )
        `
      )
      .run(input);
  }

  complete(input: CompleteSyncRunLogInput): void {
    this.database
      .prepare(
        `
          UPDATE sync_run_log
          SET
            status = @status,
            push_processed_count = @pushProcessedCount,
            pull_processed_count = @pullProcessedCount,
            conflict_count = @conflictCount,
            failure_count = @failureCount,
            completed_at = @completedAt,
            duration_ms = @durationMs,
            error_code = @errorCode
          WHERE id = @id
        `
      )
      .run(input);
  }

  list(filters: SyncRunLogFiltersDto & { userId: string }): SyncRunLogDto[] {
    const clauses = ['user_id = @userId'];
    const parameters: Record<string, string | number> = {
      userId: filters.userId,
      limit: normalizeLimit(filters.limit),
      offset: normalizeOffset(filters.offset)
    };

    if (filters.reason) {
      clauses.push('reason = @reason');
      parameters.reason = filters.reason;
    }

    if (filters.status) {
      clauses.push('status = @status');
      parameters.status = filters.status;
    }

    if (filters.dateFrom) {
      clauses.push('started_at >= @dateFrom');
      parameters.dateFrom = filters.dateFrom;
    }

    if (filters.dateTo) {
      clauses.push('started_at <= @dateTo');
      parameters.dateTo = filters.dateTo;
    }

    const rows = this.database
      .prepare(
        `
          SELECT *
          FROM sync_run_log
          WHERE ${clauses.join(' AND ')}
          ORDER BY started_at DESC
          LIMIT @limit OFFSET @offset
        `
      )
      .all(parameters) as SyncRunLogRow[];

    return rows.map(mapSyncRunLogRow);
  }

  getRecent(limit: number, userId: string): SyncRunLogDto[] {
    return this.list({ userId, limit, offset: 0 });
  }

  deleteOlderThan(date: string): number {
    const result = this.database
      .prepare(
        `
          DELETE FROM sync_run_log
          WHERE started_at < @date
            AND status != 'RUNNING'
        `
      )
      .run({ date });

    return result.changes;
  }

  trimToMaxRows(maxRows: number): number {
    const result = this.database
      .prepare(
        `
          DELETE FROM sync_run_log
          WHERE id IN (
            SELECT id
            FROM sync_run_log
            WHERE status != 'RUNNING'
            ORDER BY started_at DESC
            LIMIT -1 OFFSET @maxRows
          )
        `
      )
      .run({ maxRows: normalizeMaxRows(maxRows) });

    return result.changes;
  }
}

function mapSyncRunLogRow(row: SyncRunLogRow): SyncRunLogDto {
  return {
    id: row.id,
    reason: row.reason,
    status: row.status,
    pushProcessedCount: row.push_processed_count,
    pullProcessedCount: row.pull_processed_count,
    conflictCount: row.conflict_count,
    failureCount: row.failure_count,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
    errorCode: row.error_code
  };
}

function normalizeLimit(limit: number | undefined): number {
  if (typeof limit !== 'number' || !Number.isInteger(limit)) {
    return 20;
  }

  return Math.min(100, Math.max(1, limit));
}

function normalizeOffset(offset: number | undefined): number {
  if (typeof offset !== 'number' || !Number.isInteger(offset)) {
    return 0;
  }

  return Math.max(0, offset);
}

function normalizeMaxRows(maxRows: number): number {
  if (!Number.isInteger(maxRows)) {
    return 1000;
  }

  return Math.min(10000, Math.max(100, maxRows));
}
