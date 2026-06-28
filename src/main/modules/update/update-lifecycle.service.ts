import { ApplicationError } from '../../errors/application-error';
import { ErrorCode } from '../../errors/error-codes';

export interface UpdateLifecycleDependencies {
  isBackupInProgress: () => boolean;
  isSyncRunning: () => boolean;
  isConflictResolutionInProgress: () => boolean;
  isMigrationInProgress: () => boolean;
  stopBackgroundWork: () => void;
  closeDatabase: () => void;
}

export class UpdateLifecycleService {
  constructor(private readonly dependencies: UpdateLifecycleDependencies) {}

  assertCanInstall(): void {
    if (
      this.dependencies.isBackupInProgress() ||
      this.dependencies.isSyncRunning() ||
      this.dependencies.isConflictResolutionInProgress() ||
      this.dependencies.isMigrationInProgress()
    ) {
      throw new ApplicationError(
        ErrorCode.UpdateInstallBlocked,
        'Operação crítica em andamento.'
      );
    }
  }

  prepareForInstall(): void {
    this.assertCanInstall();
    this.dependencies.stopBackgroundWork();
    this.dependencies.closeDatabase();
  }
}
