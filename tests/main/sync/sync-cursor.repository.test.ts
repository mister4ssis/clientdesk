import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseConnection } from '@main/database/database';
import {
  CUSTOMERS_CURSOR_SCOPE,
  SyncCursorRepository
} from '@main/modules/sync/sync-cursor.repository';
import { createMigratedMemoryDatabase } from '../../helpers/test-database';

let database: DatabaseConnection | null;
let repository: SyncCursorRepository;

beforeEach(() => {
  database = createMigratedMemoryDatabase();
  repository = new SyncCursorRepository(database);
});

afterEach(() => {
  if (database?.open) {
    database.close();
  }

  database = null;
});

describe('SyncCursorRepository', () => {
  it('creates an initial cursor without remote position', () => {
    const cursor = repository.getOrCreate(
      CUSTOMERS_CURSOR_SCOPE,
      '2026-06-23T10:00:00.000Z'
    );

    expect(cursor).toEqual({
      scope: 'CUSTOMERS',
      lastRemoteUpdatedAt: null,
      lastRemoteId: null,
      updatedAt: '2026-06-23T10:00:00.000Z'
    });
  });

  it('updates a deterministic cursor using updated_at and id', () => {
    repository.update(
      CUSTOMERS_CURSOR_SCOPE,
      '2026-06-23T10:05:00.000Z',
      '00000000-0000-4000-8000-000000000001',
      '2026-06-23T10:06:00.000Z'
    );

    expect(repository.get(CUSTOMERS_CURSOR_SCOPE)).toMatchObject({
      lastRemoteUpdatedAt: '2026-06-23T10:05:00.000Z',
      lastRemoteId: '00000000-0000-4000-8000-000000000001',
      updatedAt: '2026-06-23T10:06:00.000Z'
    });
  });
});
