import type { DatabaseConnection } from '../../database/database';
import type { SyncOutboxRepository } from '../sync/sync-outbox.repository';
import type { CustomerAuditRepository } from '../audit/customer-audit.repository';
import type { CustomerAuditOperation, CustomerAuditSource } from '@shared/audit/audit.types';
import type {
  Customer,
  CustomerListResult,
  CustomerSearchFilters
} from '@shared/customers/customer.types';
import type { CustomerConflictSnapshot, SyncStatusCode } from '@shared/sync/sync.types';
import { mapCustomerRow, type CustomerRow } from './customer.mapper';

type CustomerUpdateInput = Partial<
  Pick<
    Customer,
    | 'personType'
    | 'legalName'
    | 'tradeName'
    | 'representative'
    | 'taxId'
    | 'email'
    | 'phone'
    | 'birthDate'
    | 'postalCode'
    | 'street'
    | 'addressNumber'
    | 'addressComplement'
    | 'neighborhood'
    | 'city'
    | 'state'
    | 'notes'
    | 'active'
    | 'updatedAt'
  >
>;

interface CustomerRepositoryOptions {
  syncOutboxRepository?: SyncOutboxRepository;
  customerAuditRepository?: CustomerAuditRepository;
  getAuditContext?: () => CustomerAuditContext;
}

interface CustomerAuditContext {
  userId: string;
  installationId: string;
}

interface CountRow {
  total: number;
}

interface ListQueryParts {
  whereSql: string;
  parameters: Record<string, string | number>;
}

export interface CustomerSyncMetadata {
  syncStatus: SyncStatusCode;
  remoteVersion: number | null;
  remoteUpdatedAt: string | null;
  deletedAt: string | null;
  syncConflict: boolean;
  updatedAt: string;
}

interface CustomerSyncMetadataRow {
  sync_status: SyncStatusCode;
  remote_version: number | null;
  remote_updated_at: string | null;
  deleted_at: string | null;
  sync_conflict: 0 | 1;
  updated_at: string;
}

const defaultLimit = 50;
const maxLimit = 100;

export class CustomerRepository {
  constructor(
    private readonly database: DatabaseConnection,
    private readonly options: CustomerRepositoryOptions = {}
  ) {}

  exists(): boolean {
    const row = this.database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get('customers');

    return row !== undefined;
  }

  create(input: Customer): Customer {
    const transaction = this.database.transaction((customer: Customer) => {
      this.database
        .prepare(
          `
            INSERT INTO customers (
              id,
              person_type,
              legal_name,
              trade_name,
              representative,
              tax_id,
              email,
              phone,
              birth_date,
              postal_code,
              street,
              address_number,
              address_complement,
              neighborhood,
              city,
              state,
              notes,
              active,
              created_at,
              updated_at,
              sync_status,
              last_synced_at,
              sync_error_code
            ) VALUES (
              @id,
              @personType,
              @legalName,
              @tradeName,
              @representative,
              @taxId,
              @email,
              @phone,
              @birthDate,
              @postalCode,
              @street,
              @addressNumber,
              @addressComplement,
              @neighborhood,
              @city,
              @state,
              @notes,
              @active,
              @createdAt,
              @updatedAt,
              'PENDING',
              NULL,
              NULL
            )
          `
        )
        .run({
          ...customer,
          active: customer.active ? 1 : 0
        });

      this.options.syncOutboxRepository?.enqueueCustomer(customer.id, customer.updatedAt);
      this.recordAudit({
        customerId: customer.id,
        operation: 'CREATED',
        source: 'LOCAL_USER',
        changedFields: customerAuditableFields,
        localVersion: customer.updatedAt,
        remoteVersion: null,
        createdAt: customer.updatedAt
      });

      return customer;
    });

    return transaction(input);
  }

  findById(id: string): Customer | null {
    const row = this.database
      .prepare('SELECT * FROM customers WHERE id = ?')
      .get(id) as CustomerRow | undefined;

    return row ? mapCustomerRow(row) : null;
  }

  findByTaxId(taxId: string): Customer | null {
    const row = this.database
      .prepare('SELECT * FROM customers WHERE tax_id = ?')
      .get(taxId) as CustomerRow | undefined;

    return row ? mapCustomerRow(row) : null;
  }

  list(filters: CustomerSearchFilters = {}): CustomerListResult {
    const { whereSql, parameters } = buildListQuery(filters);
    const limit = normalizeLimit(filters.limit);
    const offset = normalizeOffset(filters.offset);

    const totalRow = this.database
      .prepare(`SELECT COUNT(*) as total FROM customers ${whereSql}`)
      .get(parameters) as CountRow;

    const rows = this.database
      .prepare(
        `
          SELECT *
          FROM customers
          ${whereSql}
          ORDER BY legal_name COLLATE NOCASE ASC
          LIMIT @limit
          OFFSET @offset
        `
      )
      .all({
        ...parameters,
        limit,
        offset
      }) as CustomerRow[];

    return {
      items: rows.map(mapCustomerRow),
      total: totalRow.total
    };
  }

  update(id: string, input: CustomerUpdateInput): Customer | null {
    const entries = Object.entries(toColumnUpdateInput(input));

    if (entries.length === 0) {
      return this.findById(id);
    }

    const transaction = this.database.transaction(() => {
      const currentCustomer = this.findById(id);
      const assignments = [
        ...entries.map(([column]) => `${column} = @${column}`),
        "sync_status = 'PENDING'",
        'last_synced_at = NULL',
        'sync_error_code = NULL'
      ].join(', ');
      const parameters = Object.fromEntries(entries);

      const result = this.database
        .prepare(
          `
            UPDATE customers
            SET ${assignments}
            WHERE id = @id
          `
        )
        .run({
          ...parameters,
          id
        });

      if (result.changes > 0) {
        this.options.syncOutboxRepository?.enqueueCustomer(id, getUpdatedAt(input));
        const changedFields = currentCustomer
          ? getChangedFields(currentCustomer, input)
          : getInputFieldNames(input);

        if (changedFields.length > 0) {
          this.recordAudit({
            customerId: id,
            operation: 'UPDATED',
            source: 'LOCAL_USER',
            changedFields,
            localVersion: getUpdatedAt(input),
            remoteVersion: null,
            createdAt: getUpdatedAt(input)
          });
        }
      }
    });

    transaction();

    return this.findById(id);
  }

  setActive(id: string, active: boolean, updatedAt: string): Customer | null {
    const transaction = this.database.transaction(() => {
      const result = this.database
        .prepare(
          `
            UPDATE customers
            SET active = @active,
                updated_at = @updatedAt,
                sync_status = 'PENDING',
                last_synced_at = NULL,
                sync_error_code = NULL
            WHERE id = @id
          `
        )
        .run({
          id,
          active: active ? 1 : 0,
          updatedAt
        });

      if (result.changes > 0) {
        this.options.syncOutboxRepository?.enqueueCustomer(id, updatedAt);
        this.recordAudit({
          customerId: id,
          operation: active ? 'ACTIVATED' : 'DEACTIVATED',
          source: 'LOCAL_USER',
          changedFields: ['active'],
          localVersion: updatedAt,
          remoteVersion: null,
          createdAt: updatedAt
        });
      }
    });

    transaction();

    return this.findById(id);
  }

  markSyncedIfUnchanged(
    id: string,
    expectedUpdatedAt: string,
    syncedAt: string,
    remoteVersion?: number,
    remoteUpdatedAt?: string
  ): boolean {
    const result = this.database
      .prepare(
        `
          UPDATE customers
          SET sync_status = 'SYNCED',
              last_synced_at = @syncedAt,
              sync_error_code = NULL,
              remote_version = COALESCE(@remoteVersion, remote_version),
              remote_updated_at = COALESCE(@remoteUpdatedAt, remote_updated_at),
              sync_conflict = 0
          WHERE id = @id
            AND updated_at = @expectedUpdatedAt
        `
      )
      .run({
        id,
        expectedUpdatedAt,
        syncedAt,
        remoteVersion: remoteVersion ?? null,
        remoteUpdatedAt: remoteUpdatedAt ?? null
      });

    return result.changes > 0;
  }

  markSyncError(id: string, errorCode: string): void {
    this.database
      .prepare(
        `
          UPDATE customers
          SET sync_status = 'ERROR',
              sync_error_code = @errorCode
          WHERE id = @id
        `
      )
      .run({
        id,
        errorCode
      });
  }

  markConflict(id: string, errorCode: string): void {
    this.database
      .prepare(
        `
          UPDATE customers
          SET sync_status = 'CONFLICT',
              sync_conflict = 1,
              sync_error_code = @errorCode
          WHERE id = @id
        `
      )
      .run({
        id,
        errorCode
      });
  }

  getSyncMetadata(id: string): CustomerSyncMetadata | null {
    const row = this.database
      .prepare(
        `
          SELECT
            sync_status,
            remote_version,
            remote_updated_at,
            deleted_at,
            sync_conflict,
            updated_at
          FROM customers
          WHERE id = ?
        `
      )
      .get(id) as CustomerSyncMetadataRow | undefined;

    return row
      ? {
          syncStatus: row.sync_status,
          remoteVersion: row.remote_version,
          remoteUpdatedAt: row.remote_updated_at,
          deletedAt: row.deleted_at,
          syncConflict: row.sync_conflict === 1,
          updatedAt: row.updated_at
        }
      : null;
  }

  applyRemoteCustomer(customer: CustomerConflictSnapshot): Customer {
    const transaction = this.database.transaction(() => {
      const currentCustomer = this.findById(customer.id);
      const currentMetadata = this.getSyncMetadata(customer.id);
      const auditOperation = getRemoteAuditOperation(customer, currentCustomer, currentMetadata);
      const changedFields = currentCustomer
        ? getRemoteChangedFields(currentCustomer, currentMetadata, customer)
        : customerAuditableFields;

      this.database
        .prepare(
          `
            INSERT INTO customers (
              id,
              person_type,
              legal_name,
              trade_name,
              representative,
              tax_id,
              email,
              phone,
              birth_date,
              postal_code,
              street,
              address_number,
              address_complement,
              neighborhood,
              city,
              state,
              notes,
              active,
              created_at,
              updated_at,
              sync_status,
              last_synced_at,
              sync_error_code,
              remote_version,
              remote_updated_at,
              deleted_at,
              sync_conflict
            ) VALUES (
              @id,
              @personType,
              @legalName,
              @tradeName,
              @representative,
              @taxId,
              @email,
              @phone,
              @birthDate,
              @postalCode,
              @street,
              @addressNumber,
              @addressComplement,
              @neighborhood,
              @city,
              @state,
              @notes,
              @active,
              @createdAt,
              @updatedAt,
              'SYNCED',
              @syncedAt,
              NULL,
              @remoteVersion,
              @remoteUpdatedAt,
              @deletedAt,
              0
            )
            ON CONFLICT(id) DO UPDATE SET
              person_type = excluded.person_type,
              legal_name = excluded.legal_name,
              trade_name = excluded.trade_name,
              representative = excluded.representative,
              tax_id = excluded.tax_id,
              email = excluded.email,
              phone = excluded.phone,
              birth_date = excluded.birth_date,
              postal_code = excluded.postal_code,
              street = excluded.street,
              address_number = excluded.address_number,
              address_complement = excluded.address_complement,
              neighborhood = excluded.neighborhood,
              city = excluded.city,
              state = excluded.state,
              notes = excluded.notes,
              active = excluded.active,
              created_at = excluded.created_at,
              updated_at = excluded.updated_at,
              sync_status = 'SYNCED',
              last_synced_at = excluded.last_synced_at,
              sync_error_code = NULL,
              remote_version = excluded.remote_version,
              remote_updated_at = excluded.remote_updated_at,
              deleted_at = excluded.deleted_at,
              sync_conflict = 0
          `
        )
        .run({
          ...customer,
          active: customer.active ? 1 : 0,
          syncedAt: new Date().toISOString()
        });

      if (auditOperation && changedFields.length > 0) {
        this.recordAudit({
          customerId: customer.id,
          operation: auditOperation,
          source: 'REMOTE_SYNC',
          changedFields,
          localVersion: customer.updatedAt,
          remoteVersion: customer.remoteVersion,
          createdAt: new Date().toISOString()
        });
      }
    });

    transaction();

    const appliedCustomer = this.findById(customer.id);

    if (!appliedCustomer) {
      throw new Error('Remote customer was not applied.');
    }

    return appliedCustomer;
  }

  recordConflictResolutionAudit(input: {
    customerId: string;
    operation: 'CONFLICT_KEEP_LOCAL' | 'CONFLICT_USE_REMOTE';
    changedFields: string[];
    localVersion: string | null;
    remoteVersion: number | null;
    createdAt: string;
  }): void {
    this.recordAudit({
      customerId: input.customerId,
      operation: input.operation,
      source: 'CONFLICT_RESOLUTION',
      changedFields: input.changedFields,
      localVersion: input.localVersion,
      remoteVersion: input.remoteVersion,
      createdAt: input.createdAt
    });
  }

  private recordAudit(input: {
    customerId: string;
    operation: CustomerAuditOperation;
    source: CustomerAuditSource;
    changedFields: string[];
    localVersion: string | null;
    remoteVersion: number | null;
    createdAt: string;
  }): void {
    const context = this.options.getAuditContext?.();

    if (!this.options.customerAuditRepository || !context) {
      return;
    }

    this.options.customerAuditRepository.record({
      ...input,
      userId: context.userId,
      installationId: context.installationId
    });
  }
}

const customerAuditableFields: Array<keyof CustomerConflictSnapshot> = [
  'personType',
  'legalName',
  'tradeName',
  'representative',
  'taxId',
  'email',
  'phone',
  'birthDate',
  'postalCode',
  'street',
  'addressNumber',
  'addressComplement',
  'neighborhood',
  'city',
  'state',
  'notes',
  'active'
];

function buildListQuery(filters: CustomerSearchFilters): ListQueryParts {
  const conditions: string[] = ['deleted_at IS NULL'];
  const parameters: Record<string, string | number> = {};

  if (typeof filters.active === 'boolean') {
    conditions.push('active = @active');
    parameters.active = filters.active ? 1 : 0;
  }

  const search = filters.search?.trim();

  if (search) {
    const searchConditions = [
      "legal_name COLLATE NOCASE LIKE @searchText ESCAPE '\\'",
      "trade_name COLLATE NOCASE LIKE @searchText ESCAPE '\\'",
      "representative COLLATE NOCASE LIKE @searchText ESCAPE '\\'",
      "email COLLATE NOCASE LIKE @searchText ESCAPE '\\'"
    ];
    const searchDigits = search.replace(/\D/g, '');

    if (searchDigits.length > 0) {
      searchConditions.push('tax_id LIKE @searchDigits', 'phone LIKE @searchDigits');
      parameters.searchDigits = `%${searchDigits}%`;
    }

    conditions.push(`(${searchConditions.join(' OR ')})`);
    parameters.searchText = `%${escapeLike(search)}%`;
  }

  return {
    whereSql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
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

function escapeLike(value: string): string {
  return value.replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function toColumnUpdateInput(input: CustomerUpdateInput): Record<string, string | number | null> {
  const columns: Record<string, string | number | null> = {};

  assignIfDefined(columns, 'person_type', input.personType);
  assignIfDefined(columns, 'legal_name', input.legalName);
  assignIfDefined(columns, 'trade_name', input.tradeName);
  assignIfDefined(columns, 'representative', input.representative);
  assignIfDefined(columns, 'tax_id', input.taxId);
  assignIfDefined(columns, 'email', input.email);
  assignIfDefined(columns, 'phone', input.phone);
  assignIfDefined(columns, 'birth_date', input.birthDate);
  assignIfDefined(columns, 'postal_code', input.postalCode);
  assignIfDefined(columns, 'street', input.street);
  assignIfDefined(columns, 'address_number', input.addressNumber);
  assignIfDefined(columns, 'address_complement', input.addressComplement);
  assignIfDefined(columns, 'neighborhood', input.neighborhood);
  assignIfDefined(columns, 'city', input.city);
  assignIfDefined(columns, 'state', input.state);
  assignIfDefined(columns, 'notes', input.notes);
  assignIfDefined(columns, 'updated_at', input.updatedAt);

  if (typeof input.active === 'boolean') {
    columns.active = input.active ? 1 : 0;
  }

  return columns;
}

function getUpdatedAt(input: CustomerUpdateInput): string {
  return input.updatedAt ?? new Date().toISOString();
}

function assignIfDefined(
  target: Record<string, string | number | null>,
  column: string,
  value: string | null | undefined
): void {
  if (value !== undefined) {
    target[column] = value;
  }
}

function getChangedFields(currentCustomer: Customer, input: CustomerUpdateInput): string[] {
  return getInputFieldNames(input).filter((field) => {
    const currentValue = currentCustomer[field as keyof Customer];
    const nextValue = input[field as keyof CustomerUpdateInput];

    return currentValue !== nextValue;
  });
}

function getInputFieldNames(input: CustomerUpdateInput): string[] {
  return customerAuditableFields.filter((field) => input[field as keyof CustomerUpdateInput] !== undefined);
}

function getRemoteAuditOperation(
  remoteCustomer: CustomerConflictSnapshot,
  currentCustomer: Customer | null,
  currentMetadata: CustomerSyncMetadata | null
): CustomerAuditOperation | null {
  if (remoteCustomer.deletedAt && remoteCustomer.deletedAt !== currentMetadata?.deletedAt) {
    return 'REMOTE_DELETED';
  }

  if (!currentCustomer) {
    return 'REMOTE_CREATED';
  }

  return getRemoteChangedFields(currentCustomer, currentMetadata, remoteCustomer).length > 0
    ? 'REMOTE_UPDATED'
    : null;
}

function getRemoteChangedFields(
  currentCustomer: Customer,
  currentMetadata: CustomerSyncMetadata | null,
  remoteCustomer: CustomerConflictSnapshot
): string[] {
  const fields = customerAuditableFields.filter((field) => {
    const currentValue = currentCustomer[field as keyof Customer];
    const remoteValue = remoteCustomer[field];

    return currentValue !== remoteValue;
  });

  if (remoteCustomer.deletedAt !== currentMetadata?.deletedAt) {
    fields.push('deletedAt');
  }

  return fields;
}
