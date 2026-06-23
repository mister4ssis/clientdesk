export type ConnectivityStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'AUTH_ERROR'
  | 'REMOTE_ERROR'
  | 'DISABLED';

export type SyncStatusCode = 'PENDING' | 'SYNCED' | 'ERROR';

export interface SyncStatus {
  enabled: boolean;
  connectivity: ConnectivityStatus;
  running: boolean;
  pendingCount: number;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastSuccessfulAt: string | null;
  lastErrorCode: string | null;
}

export interface SyncRunResult {
  started: boolean;
  status: SyncStatus;
}
