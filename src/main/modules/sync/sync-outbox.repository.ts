import { randomUUID } from 'node:crypto';
import type { DatabaseConnection } from '../../database/database';

export type SyncEntityType = 'CUSTOMER';
export type SyncOperation = 'UPSERT';

export interface SyncOutboxItem {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  attempts: number;
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SyncOutboxRow {
  id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation: SyncOperation;
  attempts: number;
  next_attempt_at: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
}

interface CountRow {
  total: number;
}

export class SyncOutboxRepository {
  constructor(private readonly database: DatabaseConnection) {}

  enqueueCustomer(customerId: string, now = new Date().toISOString()): void {
    this.database
      .prepare(
        `
          INSERT INTO sync_outbox (
            id,
            entity_type,
            entity_id,
            operation,
            attempts,
            next_attempt_at,
            last_error_code,
            created_at,
            updated_at
          ) VALUES (
            @id,
            'CUSTOMER',
            @customerId,
            'UPSERT',
            0,
            NULL,
            NULL,
            @now,
            @now
          )
          ON CONFLICT(entity_type, entity_id) DO UPDATE SET
            updated_at = excluded.updated_at,
            next_attempt_at = NULL,
            last_error_code = NULL
        `
      )
      .run({
        id: randomUUID(),
        customerId,
        now
      });
  }

  getPendingBatch(limit: number, now: string): SyncOutboxItem[] {
    const rows = this.database
      .prepare(
        `
          SELECT *
          FROM sync_outbox
          WHERE next_attempt_at IS NULL OR next_attempt_at <= @now
          ORDER BY updated_at ASC
          LIMIT @limit
        `
      )
      .all({
        now,
        limit: Math.max(1, Math.min(Math.trunc(limit), 200))
      }) as SyncOutboxRow[];

    return rows.map(mapSyncOutboxRow);
  }

  markAttemptFailed(id: string, errorCode: string, nextAttemptAt: string, now: string): void {
    this.database
      .prepare(
        `
          UPDATE sync_outbox
          SET attempts = attempts + 1,
              next_attempt_at = @nextAttemptAt,
              last_error_code = @errorCode,
              updated_at = @now
          WHERE id = @id
        `
      )
      .run({
        id,
        errorCode,
        nextAttemptAt,
        now
      });
  }

  remove(id: string): void {
    this.database.prepare('DELETE FROM sync_outbox WHERE id = ?').run(id);
  }

  removeCustomer(customerId: string): void {
    this.database
      .prepare(
        `
          DELETE FROM sync_outbox
          WHERE entity_type = 'CUSTOMER'
            AND entity_id = ?
        `
      )
      .run(customerId);
  }

  hasPendingCustomer(customerId: string): boolean {
    const row = this.database
      .prepare(
        `
          SELECT id
          FROM sync_outbox
          WHERE entity_type = 'CUSTOMER'
            AND entity_id = ?
          LIMIT 1
        `
      )
      .get(customerId) as { id: string } | undefined;

    return row !== undefined;
  }

  countPending(): number {
    const row = this.database
      .prepare('SELECT COUNT(*) as total FROM sync_outbox')
      .get() as CountRow;

    return row.total;
  }

  bootstrapPendingCustomers(now = new Date().toISOString()): void {
    this.database
      .prepare(
        `
          INSERT INTO sync_outbox (
            id,
            entity_type,
            entity_id,
            operation,
            attempts,
            next_attempt_at,
            last_error_code,
            created_at,
            updated_at
          )
          SELECT
            lower(hex(randomblob(4))) || '-' ||
              lower(hex(randomblob(2))) || '-4' ||
              substr(lower(hex(randomblob(2))), 2) || '-' ||
              substr('89ab', abs(random()) % 4 + 1, 1) ||
              substr(lower(hex(randomblob(2))), 2) || '-' ||
              lower(hex(randomblob(6))),
            'CUSTOMER',
            customers.id,
            'UPSERT',
            0,
            NULL,
            NULL,
            @now,
            @now
          FROM customers
          WHERE customers.sync_status = 'PENDING'
          ON CONFLICT(entity_type, entity_id) DO NOTHING
        `
      )
      .run({ now });
  }
}

function mapSyncOutboxRow(row: SyncOutboxRow): SyncOutboxItem {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lastErrorCode: row.last_error_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
