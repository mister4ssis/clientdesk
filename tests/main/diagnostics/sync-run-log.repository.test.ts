import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseConnection } from '@main/database/database';
import { SyncRunLogRepository } from '@main/modules/diagnostics/sync-run-log.repository';
import { createMigratedMemoryDatabase } from '../../helpers/test-database';

let database: DatabaseConnection | null;
let repository: SyncRunLogRepository;

beforeEach(() => {
  database = createMigratedMemoryDatabase();
  repository = new SyncRunLogRepository(database);
});

afterEach(() => {
  database?.close();
  database = null;
});

describe('SyncRunLogRepository', () => {
  it('records a running cycle and finalizes it as success', () => {
    repository.start({
      id: runId,
      reason: 'MANUAL',
      startedAt: '2026-06-25T10:00:00.000Z',
      userId,
      installationId
    });
    repository.complete({
      id: runId,
      status: 'SUCCESS',
      pushProcessedCount: 1,
      pullProcessedCount: 2,
      conflictCount: 0,
      failureCount: 0,
      completedAt: '2026-06-25T10:00:01.000Z',
      durationMs: 1000,
      errorCode: null
    });

    expect(repository.list({ userId, limit: 10, offset: 0 })).toEqual([
      expect.objectContaining({
        id: runId,
        reason: 'MANUAL',
        status: 'SUCCESS',
        pushProcessedCount: 1,
        pullProcessedCount: 2,
        durationMs: 1000,
        errorCode: null
      })
    ]);
  });

  it('trims old technical logs', () => {
    repository.start(makeRun({ id: 'run-old', startedAt: '2026-01-01T00:00:00.000Z' }));
    repository.complete(makeComplete({ id: 'run-old', completedAt: '2026-01-01T00:00:01.000Z' }));
    repository.start(makeRun({ id: 'run-new', startedAt: '2026-06-01T00:00:00.000Z' }));
    repository.complete(makeComplete({ id: 'run-new', completedAt: '2026-06-01T00:00:01.000Z' }));

    expect(repository.deleteOlderThan('2026-03-01T00:00:00.000Z')).toBe(1);
    expect(repository.list({ userId, limit: 10, offset: 0 }).map((run) => run.id)).toEqual([
      'run-new'
    ]);
  });
});

const runId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const installationId = '33333333-3333-4333-8333-333333333333';

function makeRun(
  overrides: Partial<Parameters<SyncRunLogRepository['start']>[0]> = {}
): Parameters<SyncRunLogRepository['start']>[0] {
  return {
    id: runId,
    reason: 'PERIODIC',
    startedAt: '2026-06-25T10:00:00.000Z',
    userId,
    installationId,
    ...overrides
  };
}

function makeComplete(
  overrides: Partial<Parameters<SyncRunLogRepository['complete']>[0]> = {}
): Parameters<SyncRunLogRepository['complete']>[0] {
  return {
    id: runId,
    status: 'SUCCESS',
    pushProcessedCount: 0,
    pullProcessedCount: 0,
    conflictCount: 0,
    failureCount: 0,
    completedAt: '2026-06-25T10:00:01.000Z',
    durationMs: 1000,
    errorCode: null,
    ...overrides
  };
}
