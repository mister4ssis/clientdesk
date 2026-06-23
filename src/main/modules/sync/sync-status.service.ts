import type { ConnectivityStatus, SyncStatus } from '@shared/sync/sync.types';
import type { SyncOutboxRepository } from './sync-outbox.repository';

export class SyncStatusService {
  private status: Omit<SyncStatus, 'pendingCount'>;

  constructor(
    enabled: boolean,
    private readonly syncOutboxRepository: SyncOutboxRepository
  ) {
    this.status = {
      enabled,
      connectivity: enabled ? 'OFFLINE' : 'DISABLED',
      running: false,
      lastStartedAt: null,
      lastCompletedAt: null,
      lastSuccessfulAt: null,
      lastErrorCode: null
    };
  }

  getStatus(): SyncStatus {
    return {
      ...this.status,
      pendingCount: this.syncOutboxRepository.countPending()
    };
  }

  setEnabled(enabled: boolean): void {
    this.status.enabled = enabled;
    this.status.connectivity = enabled ? this.status.connectivity : 'DISABLED';
  }

  setConnectivity(connectivity: ConnectivityStatus): void {
    this.status.connectivity = connectivity;
  }

  markStarted(now = new Date().toISOString()): void {
    this.status.running = true;
    this.status.lastStartedAt = now;
    this.status.lastErrorCode = null;
  }

  markCompleted(success: boolean, errorCode: string | null, now = new Date().toISOString()): void {
    this.status.running = false;
    this.status.lastCompletedAt = now;
    this.status.lastErrorCode = errorCode;

    if (success) {
      this.status.lastSuccessfulAt = now;
    }
  }

  markSkipped(errorCode: string): void {
    this.status.lastErrorCode = errorCode;
  }
}
