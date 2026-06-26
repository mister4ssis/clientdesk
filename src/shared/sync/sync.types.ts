export type ConnectivityStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'AUTH_ERROR'
  | 'REMOTE_ERROR'
  | 'DISABLED';

export type SyncStatusCode = 'PENDING' | 'SYNCED' | 'ERROR' | 'CONFLICT';

export type SyncDirection = 'IDLE' | 'PUSHING' | 'PULLING' | 'RESOLVING_CONFLICT';

export type RealtimeConnectionStatus =
  | 'DISABLED'
  | 'CONNECTING'
  | 'SUBSCRIBED'
  | 'RECONNECTING'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'AUTH_ERROR'
  | 'OFFLINE'
  | 'STOPPED';

export interface SyncStatus {
  enabled: boolean;
  pullEnabled: boolean;
  realtimeStatus: RealtimeConnectionStatus;
  connectivity: ConnectivityStatus;
  running: boolean;
  direction: SyncDirection;
  pendingCount: number;
  conflictCount: number;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastPushAt: string | null;
  lastPullAt: string | null;
  lastRealtimeEventAt: string | null;
  lastRealtimeConnectedAt: string | null;
  lastSuccessfulAt: string | null;
  lastErrorCode: string | null;
}

export interface SyncRunResult {
  started: boolean;
  status: SyncStatus;
}

export type SyncConflictStatus = 'PENDING' | 'RESOLVED_LOCAL' | 'RESOLVED_REMOTE';

export interface CustomerConflictSnapshot {
  id: string;
  personType: 'FISICA' | 'JURIDICA';
  legalName: string;
  tradeName: string | null;
  representative: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  postalCode: string | null;
  street: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  remoteVersion: number | null;
  remoteUpdatedAt: string | null;
}

export interface SyncConflictSummary {
  id: string;
  entityId: string;
  customerName: string;
  localUpdatedAt: string;
  remoteUpdatedAt: string;
  remoteVersion: number;
  status: SyncConflictStatus;
  createdAt: string;
}

export interface SyncConflictDetails extends SyncConflictSummary {
  localData: CustomerConflictSnapshot;
  remoteData: CustomerConflictSnapshot;
}
