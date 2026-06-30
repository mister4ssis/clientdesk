export type UpdateStatus =
  | 'DISABLED'
  | 'IDLE'
  | 'CHECKING'
  | 'UPDATE_AVAILABLE'
  | 'UPDATE_NOT_AVAILABLE'
  | 'DOWNLOADING'
  | 'DOWNLOADED'
  | 'INSTALLING'
  | 'ERROR';

export type UpdateChannel = 'stable' | 'beta';

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  availableVersion: string | null;
  downloadPercent: number | null;
  lastCheckedAt: string | null;
  errorCode: string | null;
}

export interface UpdateOperationResult {
  started: boolean;
  state: UpdateState;
}
