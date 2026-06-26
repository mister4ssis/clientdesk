import type {
  ConnectivityStatus,
  RealtimeConnectionStatus,
  SyncDirection,
  SyncStatus
} from '@shared/sync/sync.types';
import type { SyncOutboxRepository } from './sync-outbox.repository';
import type { SyncConflictRepository } from './sync-conflict.repository';

export class SyncStatusService {
  private status: Omit<SyncStatus, 'pendingCount' | 'conflictCount'>;

  constructor(
    enabled: boolean,
    private readonly syncOutboxRepository: SyncOutboxRepository,
    private readonly options: {
      pullEnabled?: boolean;
      syncConflictRepository?: SyncConflictRepository;
    } = {}
  ) {
    this.status = {
      enabled,
      pullEnabled: options.pullEnabled ?? false,
      realtimeStatus: enabled ? 'STOPPED' : 'DISABLED',
      connectivity: enabled ? 'OFFLINE' : 'DISABLED',
      running: false,
      direction: 'IDLE',
      lastStartedAt: null,
      lastCompletedAt: null,
      lastPushAt: null,
      lastPullAt: null,
      lastRealtimeEventAt: null,
      lastRealtimeConnectedAt: null,
      lastSuccessfulAt: null,
      lastErrorCode: null
    };
  }

  getStatus(): SyncStatus {
    return {
      ...this.status,
      pendingCount: this.syncOutboxRepository.countPending(),
      conflictCount: this.options.syncConflictRepository?.countPending() ?? 0
    };
  }

  setEnabled(enabled: boolean): void {
    this.status.enabled = enabled;
    this.status.connectivity = enabled ? this.status.connectivity : 'DISABLED';
    this.status.realtimeStatus = enabled ? this.status.realtimeStatus : 'DISABLED';
  }

  setConnectivity(connectivity: ConnectivityStatus): void {
    this.status.connectivity = connectivity;
  }

  markStarted(now = new Date().toISOString()): void {
    this.status.running = true;
    this.status.direction = 'IDLE';
    this.status.lastStartedAt = now;
    this.status.lastErrorCode = null;
  }

  markCompleted(success: boolean, errorCode: string | null, now = new Date().toISOString()): void {
    this.status.running = false;
    this.status.direction = 'IDLE';
    this.status.lastCompletedAt = now;
    this.status.lastErrorCode = errorCode;

    if (success) {
      this.status.lastSuccessfulAt = now;
    }
  }

  markSkipped(errorCode: string): void {
    this.status.lastErrorCode = errorCode;
  }

  setDirection(direction: SyncDirection): void {
    this.status.direction = direction;
  }

  markPushCompleted(now = new Date().toISOString()): void {
    this.status.lastPushAt = now;
  }

  markPullCompleted(now = new Date().toISOString()): void {
    this.status.lastPullAt = now;
  }

  setPullEnabled(enabled: boolean): void {
    this.status.pullEnabled = enabled;
  }

  setRealtimeStatus(status: RealtimeConnectionStatus, now = new Date().toISOString()): void {
    this.status.realtimeStatus = status;

    if (status === 'SUBSCRIBED') {
      this.status.lastRealtimeConnectedAt = now;
    }
  }

  markRealtimeEvent(now = new Date().toISOString()): void {
    this.status.lastRealtimeEventAt = now;
  }
}
