export enum ErrorCode {
  ValidationError = 'VALIDATION_ERROR',
  CustomerNotFound = 'CUSTOMER_NOT_FOUND',
  CustomerTaxIdAlreadyExists = 'CUSTOMER_TAX_ID_ALREADY_EXISTS',
  DatabaseError = 'DATABASE_ERROR',
  InternalError = 'INTERNAL_ERROR',
  UnexpectedError = 'UNEXPECTED_ERROR',
  BackupCreateFailed = 'BACKUP_CREATE_FAILED',
  BackupRestoreFailed = 'BACKUP_RESTORE_FAILED',
  BackupInvalidFile = 'BACKUP_INVALID_FILE',
  BackupIncompatibleVersion = 'BACKUP_INCOMPATIBLE_VERSION',
  BackupOperationInProgress = 'BACKUP_OPERATION_IN_PROGRESS',
  BackupCancelled = 'BACKUP_CANCELLED'
}
