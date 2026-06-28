import { randomUUID } from 'node:crypto';
import type { DatabaseConnection } from '../../database/database';
import type { CustomerAuditEntryDto, CustomerAuditListResultDto } from '@shared/audit/audit.types';
import { mapCustomerAuditRow, serializeChangedFields } from './customer-audit.mapper';
import type {
  CustomerAuditQueryFilters,
  CustomerAuditRecordInput,
  CustomerAuditRow
} from './customer-audit.types';

interface CountRow {
  total: number;
}

interface QueryParts {
  whereSql: string;
  parameters: Record<string, string | number>;
}

const defaultLimit = 20;
const maxLimit = 100;

export class CustomerAuditRepository {
  constructor(private readonly database: DatabaseConnection) {}

  record(input: CustomerAuditRecordInput): void {
    this.database
      .prepare(
        `
          INSERT INTO customer_audit_log (
            id,
            customer_id,
            operation,
            source,
            changed_fields,
            user_id,
            installation_id,
            local_version,
            remote_version,
            created_at
          ) VALUES (
            @id,
            @customerId,
            @operation,
            @source,
            @changedFields,
            @userId,
            @installationId,
            @localVersion,
            @remoteVersion,
            @createdAt
          )
        `
      )
      .run({
        id: randomUUID(),
        customerId: input.customerId,
        operation: input.operation,
        source: input.source,
        changedFields: serializeChangedFields(input.changedFields),
        userId: input.userId,
        installationId: input.installationId,
        localVersion: input.localVersion ?? null,
        remoteVersion: input.remoteVersion ?? null,
        createdAt: input.createdAt ?? new Date().toISOString()
      });
  }

  listByCustomer(customerId: string, filters: CustomerAuditQueryFilters): CustomerAuditListResultDto {
    const { whereSql, parameters } = buildQuery({
      ...filters,
      customerId
    });
    const limit = normalizeLimit(filters.limit);
    const offset = normalizeOffset(filters.offset);
    const totalRow = this.database
      .prepare(`SELECT COUNT(*) as total FROM customer_audit_log ${whereSql}`)
      .get(parameters) as CountRow;
    const rows = this.database
      .prepare(
        `
          SELECT *
          FROM customer_audit_log
          ${whereSql}
          ORDER BY created_at DESC
          LIMIT @limit
          OFFSET @offset
        `
      )
      .all({
        ...parameters,
        limit,
        offset
      }) as CustomerAuditRow[];

    return {
      items: rows.map(mapCustomerAuditRow),
      total: totalRow.total
    };
  }

  countByCustomer(customerId: string, userId: string): number {
    const row = this.database
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM customer_audit_log
          WHERE customer_id = @customerId
            AND user_id = @userId
        `
      )
      .get({ customerId, userId }) as CountRow;

    return row.total;
  }

  getRecent(limit: number, userId: string): CustomerAuditEntryDto[] {
    const rows = this.database
      .prepare(
        `
          SELECT *
          FROM customer_audit_log
          WHERE user_id = @userId
          ORDER BY created_at DESC
          LIMIT @limit
        `
      )
      .all({
        userId,
        limit: normalizeLimit(limit)
      }) as CustomerAuditRow[];

    return rows.map(mapCustomerAuditRow);
  }

  deleteOlderThan(date: string): number {
    const result = this.database
      .prepare('DELETE FROM customer_audit_log WHERE created_at < ?')
      .run(date);

    return result.changes;
  }
}

function buildQuery(filters: CustomerAuditQueryFilters & { customerId: string }): QueryParts {
  const conditions = ['customer_id = @customerId', 'user_id = @userId'];
  const parameters: Record<string, string | number> = {
    customerId: filters.customerId,
    userId: filters.userId
  };

  if (filters.operation) {
    conditions.push('operation = @operation');
    parameters.operation = filters.operation;
  }

  if (filters.source) {
    conditions.push('source = @source');
    parameters.source = filters.source;
  }

  if (filters.dateFrom) {
    conditions.push('created_at >= @dateFrom');
    parameters.dateFrom = filters.dateFrom;
  }

  if (filters.dateTo) {
    conditions.push('created_at <= @dateTo');
    parameters.dateTo = filters.dateTo;
  }

  return {
    whereSql: `WHERE ${conditions.join(' AND ')}`,
    parameters
  };
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || limit < 1) {
    return defaultLimit;
  }

  return Math.min(Math.trunc(limit), maxLimit);
}

function normalizeOffset(offset: number | undefined): number {
  if (!offset || offset < 0) {
    return 0;
  }

  return Math.trunc(offset);
}
