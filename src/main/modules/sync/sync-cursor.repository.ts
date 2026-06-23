import type { DatabaseConnection } from '../../database/database';

export const CUSTOMERS_CURSOR_SCOPE = 'CUSTOMERS';

export interface SyncCursor {
  scope: string;
  lastRemoteUpdatedAt: string | null;
  lastRemoteId: string | null;
  updatedAt: string;
}

interface SyncCursorRow {
  scope: string;
  last_remote_updated_at: string | null;
  last_remote_id: string | null;
  updated_at: string;
}

export class SyncCursorRepository {
  constructor(private readonly database: DatabaseConnection) {}

  get(scope: string): SyncCursor | null {
    const row = this.database
      .prepare('SELECT * FROM sync_cursors WHERE scope = ?')
      .get(scope) as SyncCursorRow | undefined;

    return row ? mapCursorRow(row) : null;
  }

  getOrCreate(scope: string, now = new Date().toISOString()): SyncCursor {
    const existingCursor = this.get(scope);

    if (existingCursor) {
      return existingCursor;
    }

    this.database
      .prepare(
        `
          INSERT INTO sync_cursors (
            scope,
            last_remote_updated_at,
            last_remote_id,
            updated_at
          ) VALUES (
            @scope,
            NULL,
            NULL,
            @now
          )
        `
      )
      .run({ scope, now });

    return {
      scope,
      lastRemoteUpdatedAt: null,
      lastRemoteId: null,
      updatedAt: now
    };
  }

  update(scope: string, lastRemoteUpdatedAt: string, lastRemoteId: string, now = new Date().toISOString()): void {
    this.database
      .prepare(
        `
          INSERT INTO sync_cursors (
            scope,
            last_remote_updated_at,
            last_remote_id,
            updated_at
          ) VALUES (
            @scope,
            @lastRemoteUpdatedAt,
            @lastRemoteId,
            @now
          )
          ON CONFLICT(scope) DO UPDATE SET
            last_remote_updated_at = excluded.last_remote_updated_at,
            last_remote_id = excluded.last_remote_id,
            updated_at = excluded.updated_at
        `
      )
      .run({
        scope,
        lastRemoteUpdatedAt,
        lastRemoteId,
        now
      });
  }
}

function mapCursorRow(row: SyncCursorRow): SyncCursor {
  return {
    scope: row.scope,
    lastRemoteUpdatedAt: row.last_remote_updated_at,
    lastRemoteId: row.last_remote_id,
    updatedAt: row.updated_at
  };
}
