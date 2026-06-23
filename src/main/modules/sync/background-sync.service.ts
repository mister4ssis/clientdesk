import type { SyncRunResult } from '@shared/sync/sync.types';
import { ErrorCode } from '../../errors/error-codes';
import type { SupabaseConnectivityService } from '../../integrations/supabase/supabase-connectivity.service';
import type { SupabaseSyncConfig } from '../../integrations/supabase/supabase-config';
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
    private readonly syncStatusService: SyncStatusService
  ) {}

  getStatus() {
    return this.syncStatusService.getStatus();
  }

  async runNow(): Promise<SyncRunResult> {
    if (!this.config.enabled) {
      this.syncStatusService.setEnabled(false);
      this.syncStatusService.setConnectivity('DISABLED');
      this.syncStatusService.markCompleted(false, ErrorCode.SyncDisabled);

      return {
        started: false,
        status: this.syncStatusService.getStatus()
      };
    }

    if (this.running) {
      this.syncStatusService.markSkipped(ErrorCode.SyncOperationInProgress);

      return {
        started: false,
        status: this.syncStatusService.getStatus()
      };
    }

    this.running = true;
    this.syncStatusService.markStarted();

    try {
      const connectivity = await this.connectivityService.check();
      this.syncStatusService.setConnectivity(connectivity);

      if (connectivity !== 'ONLINE') {
        const errorCode = connectivityToErrorCode(connectivity);
        this.syncStatusService.markCompleted(false, errorCode);

        return {
          started: false,
          status: this.syncStatusService.getStatus()
        };
      }

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

      this.syncStatusService.markCompleted(lastErrorCode === null, lastErrorCode);

      return {
        started: true,
        status: this.syncStatusService.getStatus()
      };
    } catch {
      this.syncStatusService.markCompleted(false, ErrorCode.SyncRemoteError);

      return {
        started: false,
        status: this.syncStatusService.getStatus()
      };
    } finally {
      this.running = false;
    }
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
