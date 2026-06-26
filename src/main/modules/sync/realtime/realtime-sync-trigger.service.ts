import type { SyncRunResult } from '@shared/sync/sync.types';
import { ErrorCode } from '../../../errors/error-codes';
import type { BackgroundSyncService } from '../background-sync.service';
import type { SyncStatusService } from '../sync-status.service';

export type RealtimeTriggerReason = 'DATABASE_CHANGE' | 'RETRY_AFTER_RUNNING';

export interface RealtimeSyncTriggerOptions {
  debounceMs: number;
  requestSync: Pick<BackgroundSyncService, 'requestSync'>;
  syncStatusService: Pick<SyncStatusService, 'markRealtimeEvent'>;
}

export class RealtimeSyncTriggerService {
  private stopped = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private bufferedEventCount = 0;
  private syncInFlight = false;
  private pendingAfterCurrent = false;

  constructor(private readonly options: RealtimeSyncTriggerOptions) {}

  handleDatabaseChange(payload: unknown): void {
    if (this.stopped || !isValidRealtimePayload(payload)) {
      return;
    }

    this.bufferedEventCount += 1;
    this.options.syncStatusService.markRealtimeEvent();
    this.scheduleFlush(this.options.debounceMs);
  }

  stop(): void {
    this.stopped = true;
    this.clearTimer();
    this.bufferedEventCount = 0;
    this.pendingAfterCurrent = false;
  }

  start(): void {
    this.stopped = false;
  }

  private scheduleFlush(delayMs: number): void {
    if (this.debounceTimer) {
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flush();
    }, delayMs);
    this.debounceTimer.unref?.();
  }

  private async flush(): Promise<void> {
    if (this.stopped || (this.bufferedEventCount === 0 && !this.pendingAfterCurrent)) {
      return;
    }

    if (this.syncInFlight) {
      this.pendingAfterCurrent = true;
      return;
    }

    const bufferedEventCount = this.bufferedEventCount;
    this.bufferedEventCount = 0;
    this.pendingAfterCurrent = false;
    this.syncInFlight = true;
    logRealtimeTrigger({
      event: 'REALTIME_SYNC_TRIGGERED',
      bufferedEventCount,
      reason: 'DATABASE_CHANGE'
    });

    try {
      const result = await this.options.requestSync.requestSync({ reason: 'REALTIME_EVENT' });
      const operationInProgress =
        result.status.lastErrorCode === ErrorCode.SyncOperationInProgress;

      if (operationInProgress) {
        this.pendingAfterCurrent = true;
      }

      if (shouldRunAgain(result, this.bufferedEventCount, this.pendingAfterCurrent)) {
        this.scheduleFlush(this.options.debounceMs);
      }
    } catch {
      this.pendingAfterCurrent = true;
      this.scheduleFlush(this.options.debounceMs);
    } finally {
      this.syncInFlight = false;
    }
  }

  private clearTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

function shouldRunAgain(
  result: SyncRunResult,
  bufferedEventCount: number,
  pendingAfterCurrent: boolean
): boolean {
  return (
    bufferedEventCount > 0 ||
    pendingAfterCurrent ||
    result.status.lastErrorCode === ErrorCode.SyncOperationInProgress
  );
}

function isValidRealtimePayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const record = payload as {
    operation?: unknown;
    schema?: unknown;
    table?: unknown;
  };

  return (
    (record.operation === 'INSERT' ||
      record.operation === 'UPDATE' ||
      record.operation === 'DELETE') &&
    record.schema === 'public' &&
    record.table === 'customers'
  );
}

function logRealtimeTrigger(input: {
  event: 'REALTIME_SYNC_TRIGGERED';
  bufferedEventCount: number;
  reason: RealtimeTriggerReason;
}): void {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  console.info('[realtime-sync]', input);
}
