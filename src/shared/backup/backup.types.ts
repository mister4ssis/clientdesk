export interface BackupResult {
  success: boolean;
  fileName?: string;
  createdAt?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredAt?: string;
}

export interface BackupValidationResult {
  valid: boolean;
  version?: number;
  createdAt?: string;
  reason?: string;
}
