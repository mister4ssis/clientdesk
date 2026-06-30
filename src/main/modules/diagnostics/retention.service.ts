import type { CustomerAuditRepository } from '../audit/customer-audit.repository';
import type { SyncRunLogRepository } from './sync-run-log.repository';

export interface RetentionSettings {
  auditRetentionDays: number;
  syncLogRetentionDays: number;
  syncLogMaxRows: number;
}

export class RetentionService {
  constructor(
    private readonly customerAuditRepository: CustomerAuditRepository,
    private readonly syncRunLogRepository: SyncRunLogRepository,
    private readonly settings: RetentionSettings
  ) {}

  run(now = Date.now()): void {
    this.runSafely(() =>
      this.customerAuditRepository.deleteOlderThan(
        daysBefore(now, this.settings.auditRetentionDays)
      )
    );
    this.runSafely(() =>
      this.syncRunLogRepository.deleteOlderThan(
        daysBefore(now, this.settings.syncLogRetentionDays)
      )
    );
    this.runSafely(() => this.syncRunLogRepository.trimToMaxRows(this.settings.syncLogMaxRows));
  }

  private runSafely(operation: () => void): void {
    try {
      operation();
    } catch {
      console.warn('[diagnostics]', {
        event: 'RETENTION_FAILED',
        code: 'RETENTION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
}

function daysBefore(now: number, days: number): string {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}
