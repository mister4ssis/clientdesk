import type { DatabaseConnection } from '../../database/database';
import type { AuthService } from '../auth/auth.service';
import type { SyncCursorRepository } from '../sync/sync-cursor.repository';
import { CUSTOMERS_CURSOR_SCOPE } from '../sync/sync-cursor.repository';
import type { SyncConflictRepository } from '../sync/sync-conflict.repository';
import type { SyncOutboxRepository } from '../sync/sync-outbox.repository';
import type { BackgroundSyncService } from '../sync/background-sync.service';
import type { InstallationService } from '../installation/installation.service';
import type { SyncRunLogRepository } from './sync-run-log.repository';
import { maskEmail, sanitizeErrorCode } from './diagnostics-sanitizer';
import type {
  DiagnosticsSummaryDto,
  SyncRunLogDto,
  SyncRunLogFiltersDto
} from '@shared/diagnostics/diagnostics.types';
import { syncRunLogFiltersSchema } from '@shared/diagnostics/diagnostics.schemas';
import { ApplicationError } from '../../errors/application-error';
import { ErrorCode } from '../../errors/error-codes';

interface SchemaMigrationRow {
  version: number;
}

interface IntegrityCheckRow {
  integrity_check: string;
}

export interface DiagnosticsServiceDependencies {
  database: DatabaseConnection;
  authService: AuthService;
  syncService: BackgroundSyncService;
  syncOutboxRepository: SyncOutboxRepository;
  syncConflictRepository: SyncConflictRepository;
  syncCursorRepository: SyncCursorRepository;
  syncRunLogRepository: SyncRunLogRepository;
  installationService: InstallationService;
  getAppVersion: () => string;
}

export class DiagnosticsService {
  constructor(private readonly dependencies: DiagnosticsServiceDependencies) {}

  getSummary(): DiagnosticsSummaryDto {
    const authState = this.dependencies.authService.getState();
    const maskedEmail = maskEmail(authState.user?.email);
    const syncStatus = this.dependencies.syncService.getStatus();
    const cursor = this.dependencies.syncCursorRepository.get(CUSTOMERS_CURSOR_SCOPE);

    return {
      appVersion: this.dependencies.getAppVersion(),
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron ?? 'unknown',
      nodeVersion: process.versions.node,
      schemaVersion: this.getCurrentSchemaVersion(),
      appliedMigrations: this.getAppliedMigrations(),
      authState: {
        ...authState,
        user: authState.user
          ? {
              ...authState.user,
              email: maskedEmail
            }
          : null
      },
      maskedEmail,
      syncStatus,
      outboxPendingCount: this.dependencies.syncOutboxRepository.countPending(),
      conflictCount: this.dependencies.syncConflictRepository.countPending(),
      installationIdShort: this.dependencies.installationService.getShortInstallationId(),
      customerCursor: cursor
        ? {
            lastRemoteUpdatedAt: cursor.lastRemoteUpdatedAt,
            lastRemoteId: cursor.lastRemoteId
          }
        : null,
      integrityCheck: this.getIntegrityCheck(),
      lastErrorCode: sanitizeErrorCode(syncStatus.lastErrorCode)
    };
  }

  listSyncRuns(filters: SyncRunLogFiltersDto = {}): SyncRunLogDto[] {
    const parsedFilters = syncRunLogFiltersSchema.parse(filters);
    const userId = this.dependencies.authService.getState().user?.id;

    if (!userId) {
      throw new ApplicationError(ErrorCode.AuthNotAuthenticated, 'Usuário não autenticado.');
    }

    return this.dependencies.syncRunLogRepository.list({
      ...parsedFilters,
      userId
    });
  }

  getExportData(): {
    exportedAt: string;
    summary: DiagnosticsSummaryDto;
    syncRuns: SyncRunLogDto[];
  } {
    return {
      exportedAt: new Date().toISOString(),
      summary: this.getSummary(),
      syncRuns: this.listSyncRuns({ limit: 50 })
    };
  }

  private getCurrentSchemaVersion(): number | null {
    const rows = this.getAppliedMigrationRows();

    if (rows.length === 0) {
      return null;
    }

    return Math.max(...rows.map((row) => row.version));
  }

  private getAppliedMigrations(): number[] {
    return this.getAppliedMigrationRows().map((row) => row.version);
  }

  private getAppliedMigrationRows(): SchemaMigrationRow[] {
    return this.dependencies.database
      .prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
      .all() as SchemaMigrationRow[];
  }

  private getIntegrityCheck(): 'ok' | 'failed' {
    const row = this.dependencies.database
      .prepare('PRAGMA integrity_check')
      .get() as IntegrityCheckRow | undefined;

    return row?.integrity_check === 'ok' ? 'ok' : 'failed';
  }
}
