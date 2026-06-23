import { randomUUID } from 'node:crypto';
import type {
  CustomerConflictSnapshot,
  SyncConflictDetails,
  SyncConflictStatus,
  SyncConflictSummary
} from '@shared/sync/sync.types';
import type { DatabaseConnection } from '../../database/database';

interface SyncConflictRow {
  id: string;
  entity_type: 'CUSTOMER';
  entity_id: string;
  local_data: string;
  remote_data: string;
  local_updated_at: string;
  remote_updated_at: string;
  remote_version: number;
  status: SyncConflictStatus;
  created_at: string;
  resolved_at: string | null;
}

interface CountRow {
  total: number;
}

export class SyncConflictRepository {
  constructor(private readonly database: DatabaseConnection) {}

  upsertCustomerConflict(input: {
    entityId: string;
    localData: CustomerConflictSnapshot;
    remoteData: CustomerConflictSnapshot;
    localUpdatedAt: string;
    remoteUpdatedAt: string;
    remoteVersion: number;
    now?: string;
  }): SyncConflictDetails {
    const now = input.now ?? new Date().toISOString();
    const id = randomUUID();

    this.database
      .prepare(
        `
          INSERT INTO sync_conflicts (
            id,
            entity_type,
            entity_id,
            local_data,
            remote_data,
            local_updated_at,
            remote_updated_at,
            remote_version,
            status,
            created_at,
            resolved_at
          ) VALUES (
            @id,
            'CUSTOMER',
            @entityId,
            @localData,
            @remoteData,
            @localUpdatedAt,
            @remoteUpdatedAt,
            @remoteVersion,
            'PENDING',
            @now,
            NULL
          )
          ON CONFLICT(entity_type, entity_id, status) DO UPDATE SET
            local_data = excluded.local_data,
            remote_data = excluded.remote_data,
            local_updated_at = excluded.local_updated_at,
            remote_updated_at = excluded.remote_updated_at,
            remote_version = excluded.remote_version
        `
      )
      .run({
        id,
        entityId: input.entityId,
        localData: JSON.stringify(input.localData),
        remoteData: JSON.stringify(input.remoteData),
        localUpdatedAt: input.localUpdatedAt,
        remoteUpdatedAt: input.remoteUpdatedAt,
        remoteVersion: input.remoteVersion,
        now
      });

    const conflict = this.findPendingByEntityId(input.entityId);

    if (!conflict) {
      throw new Error('Pending conflict was not created.');
    }

    return conflict;
  }

  listPending(): SyncConflictSummary[] {
    const rows = this.database
      .prepare(
        `
          SELECT *
          FROM sync_conflicts
          WHERE status = 'PENDING'
          ORDER BY created_at ASC
        `
      )
      .all() as SyncConflictRow[];

    return rows.map(mapConflictSummaryRow);
  }

  findPendingById(id: string): SyncConflictDetails | null {
    const row = this.database
      .prepare(
        `
          SELECT *
          FROM sync_conflicts
          WHERE id = @id
            AND status = 'PENDING'
        `
      )
      .get({ id }) as SyncConflictRow | undefined;

    return row ? mapConflictDetailsRow(row) : null;
  }

  findPendingByEntityId(entityId: string): SyncConflictDetails | null {
    const row = this.database
      .prepare(
        `
          SELECT *
          FROM sync_conflicts
          WHERE entity_type = 'CUSTOMER'
            AND entity_id = @entityId
            AND status = 'PENDING'
        `
      )
      .get({ entityId }) as SyncConflictRow | undefined;

    return row ? mapConflictDetailsRow(row) : null;
  }

  markResolved(id: string, status: Exclude<SyncConflictStatus, 'PENDING'>, resolvedAt: string): void {
    this.database
      .prepare(
        `
          UPDATE sync_conflicts
          SET status = @status,
              resolved_at = @resolvedAt
          WHERE id = @id
            AND status = 'PENDING'
        `
      )
      .run({
        id,
        status,
        resolvedAt
      });
  }

  countPending(): number {
    const row = this.database
      .prepare("SELECT COUNT(*) as total FROM sync_conflicts WHERE status = 'PENDING'")
      .get() as CountRow;

    return row.total;
  }
}

function mapConflictSummaryRow(row: SyncConflictRow): SyncConflictSummary {
  const localData = parseSnapshot(row.local_data);
  const remoteData = parseSnapshot(row.remote_data);

  return {
    id: row.id,
    entityId: row.entity_id,
    customerName: localData.legalName || remoteData.legalName,
    localUpdatedAt: row.local_updated_at,
    remoteUpdatedAt: row.remote_updated_at,
    remoteVersion: row.remote_version,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapConflictDetailsRow(row: SyncConflictRow): SyncConflictDetails {
  return {
    ...mapConflictSummaryRow(row),
    localData: parseSnapshot(row.local_data),
    remoteData: parseSnapshot(row.remote_data)
  };
}

function parseSnapshot(value: string): CustomerConflictSnapshot {
  const parsed = JSON.parse(value) as CustomerConflictSnapshot;

  return parsed;
}
