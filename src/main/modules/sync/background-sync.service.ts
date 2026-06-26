import { randomUUID } from 'node:crypto';
import type { SyncRunResult } from '@shared/sync/sync.types';
import { ErrorCode } from '../../errors/error-codes';
import type { SupabaseConnectivityService } from '../../integrations/supabase/supabase-connectivity.service';
import type { SupabaseSyncConfig } from '../../integrations/supabase/supabase-config';
import type { CustomerPullService } from './customer-pull.service';
import type { CustomerSyncService } from './customer-sync.service';
import type { SyncOutboxRepository } from './sync-outbox.repository';
import type { SyncStatusService } from './sync-status.service';

export class BackgroundSyncService {
  private running = false;

  constructor(
    private readonly config: SupabaseSyncConfig,
    private readonly connectivityService: SupabaseConnectivityService,
    private readonly syncOutboxRepository: SyncOutboxRepository,
    private readonly customerSyncService: CustomerSyncService,
    private readonly syncStatusService: SyncStatusService,
    private readonly customerPullService?: CustomerPullService,
    private readonly options: { canSynchronize?: () => boolean } = {}
  ) {}

  getStatus() {
    return this.syncStatusService.getStatus();
  }

  async runNow(): Promise<SyncRunResult> {
    const syncRunId = randomUUID();
    const runStartedAt = Date.now();

    if (!this.config.enabled) {
      this.syncStatusService.setEnabled(false);
      this.syncStatusService.setConnectivity('DISABLED');
      this.syncStatusService.markCompleted(false, ErrorCode.SyncDisabled);
      logSyncRun({
        syncRunId,
        phase: 'COMPLETE',
        durationMs: Date.now() - runStartedAt,
        errorCode: ErrorCode.SyncDisabled
      });

      return {
        started: false,
        status: this.syncStatusService.getStatus()
      };
    }

    if (this.running) {
      this.syncStatusService.markSkipped(ErrorCode.SyncOperationInProgress);
      logSyncRun({
        syncRunId,
        phase: 'SKIPPED',
        durationMs: Date.now() - runStartedAt,
        errorCode: ErrorCode.SyncOperationInProgress
      });

      return {
        started: false,
        status: this.syncStatusService.getStatus()
      };
    }

    this.running = true;
    this.syncStatusService.markStarted();
    logSyncRun({
      syncRunId,
      phase: 'START',
      pendingCount: this.syncOutboxRepository.countPending()
    });

    try {
      if (this.options.canSynchronize && !this.options.canSynchronize()) {
        this.syncStatusService.setConnectivity('AUTH_ERROR');
        this.syncStatusService.markCompleted(false, ErrorCode.SyncAuthError);
        logSyncRun({
          syncRunId,
          phase: 'COMPLETE',
          durationMs: Date.now() - runStartedAt,
          errorCode: ErrorCode.SyncAuthError
        });

        return {
          started: false,
          status: this.syncStatusService.getStatus()
        };
      }

      const connectivity = await this.connectivityService.check();
      this.syncStatusService.setConnectivity(connectivity);

      if (connectivity !== 'ONLINE') {
        const errorCode = connectivityToErrorCode(connectivity);
        this.syncStatusService.markCompleted(false, errorCode);
        logSyncRun({
          syncRunId,
          phase: 'COMPLETE',
          durationMs: Date.now() - runStartedAt,
          errorCode
        });

        return {
          started: false,
          status: this.syncStatusService.getStatus()
        };
      }

      this.syncStatusService.setDirection('PUSHING');
      const pushResult = await this.pushPendingChanges();
      this.syncStatusService.markPushCompleted();
      logSyncRun({
        syncRunId,
        phase: 'PUSH',
        processedCount: pushResult.processedCount,
        pendingCount: this.syncOutboxRepository.countPending(),
        errorCode: pushResult.errorCode
      });

      let lastErrorCode = pushResult.errorCode;

      if (this.customerPullService && shouldRunPullAfterPush(pushResult.errorCode)) {
        this.syncStatusService.setDirection('PULLING');
        const pullResult = await this.customerPullService.pullRemoteChanges();
        this.syncStatusService.markPullCompleted();
        logSyncRun({
          syncRunId,
          phase: 'PULL',
          processedCount: pullResult.pulledCount,
          conflictCount: pullResult.conflictCount,
          errorCode: pullResult.errorCode
        });

        if (!pullResult.success && pullResult.errorCode) {
          lastErrorCode = pullResult.errorCode;
        }
      }

      this.syncStatusService.markCompleted(lastErrorCode === null, lastErrorCode);
      logSyncRun({
        syncRunId,
        phase: 'COMPLETE',
        durationMs: Date.now() - runStartedAt,
        errorCode: lastErrorCode
      });

      return {
        started: true,
        status: this.syncStatusService.getStatus()
      };
    } catch {
      this.syncStatusService.markCompleted(false, ErrorCode.SyncRemoteError);
      logSyncRun({
        syncRunId,
        phase: 'COMPLETE',
        durationMs: Date.now() - runStartedAt,
        errorCode: ErrorCode.SyncRemoteError
      });

      return {
        started: false,
        status: this.syncStatusService.getStatus()
      };
    } finally {
      this.running = false;
    }
  }

  private async pushPendingChanges(): Promise<{
    errorCode: string | null;
    processedCount: number;
  }> {
    const items = this.syncOutboxRepository.getPendingBatch(
      this.config.batchSize,
      new Date().toISOString()
    );
    let lastErrorCode: string | null = null;

    for (const item of items) {
      const result = await this.customerSyncService.syncCustomer(item);

      if (!result.success && result.errorCode) {
        lastErrorCode = result.errorCode;
        this.syncOutboxRepository.markAttemptFailed(
          item.id,
          result.errorCode,
          calculateNextAttemptAt(item.attempts + 1),
          new Date().toISOString()
        );
      }
    }

    return {
      errorCode: lastErrorCode,
      processedCount: items.length
    };
  }
}

export function calculateNextAttemptAt(attempts: number, now = Date.now()): string {
  const delayMinutes = attempts <= 1 ? 1 : attempts === 2 ? 2 : attempts === 3 ? 5 : attempts === 4 ? 15 : 30;
  const jitterMs = Math.floor(Math.random() * 30_000);

  return new Date(now + delayMinutes * 60_000 + jitterMs).toISOString();
}

function connectivityToErrorCode(connectivity: string): string {
  switch (connectivity) {
    case 'DISABLED':
      return ErrorCode.SyncDisabled;
    case 'AUTH_ERROR':
      return ErrorCode.SyncAuthError;
    case 'REMOTE_ERROR':
      return ErrorCode.SyncRemoteError;
    default:
      return ErrorCode.SyncNetworkUnavailable;
  }
}

function shouldRunPullAfterPush(pushErrorCode: string | null): boolean {
  return ![
    ErrorCode.SyncNetworkUnavailable,
    ErrorCode.SyncAuthError,
    ErrorCode.SyncConfigurationError
  ].includes(pushErrorCode as ErrorCode);
}

type SyncLogPhase = 'START' | 'PUSH' | 'PULL' | 'SKIPPED' | 'COMPLETE';

function logSyncRun(input: {
  syncRunId: string;
  phase: SyncLogPhase;
  processedCount?: number;
  pendingCount?: number;
  conflictCount?: number;
  durationMs?: number;
  errorCode?: string | null;
}): void {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  console.info('[sync]', {
    syncRunId: input.syncRunId,
    phase: input.phase,
    processedCount: input.processedCount,
    pendingCount: input.pendingCount,
    conflictCount: input.conflictCount,
    durationMs: input.durationMs,
    errorCode: input.errorCode ?? null
  });
}
