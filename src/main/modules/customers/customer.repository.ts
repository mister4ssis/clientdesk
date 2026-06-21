import type { DatabaseConnection } from '../../database/database';
import type {
  Customer,
  CustomerListResult,
  CustomerSearchFilters
} from '@shared/customers/customer.types';
import { mapCustomerRow, type CustomerRow } from './customer.mapper';

type CustomerUpdateInput = Partial<
  Pick<
    Customer,
    | 'personType'
    | 'legalName'
    | 'tradeName'
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

interface CountRow {
  total: number;
}

interface ListQueryParts {
  whereSql: string;
  parameters: Record<string, string | number>;
}

const defaultLimit = 50;
const maxLimit = 100;

export class CustomerRepository {
  constructor(private readonly database: DatabaseConnection) {}

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
              updated_at
            ) VALUES (
              @id,
              @personType,
              @legalName,
              @tradeName,
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
              @updatedAt
            )
          `
        )
        .run({
          ...customer,
          active: customer.active ? 1 : 0
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

    const assignments = entries.map(([column]) => `${column} = @${column}`).join(', ');
    const parameters = Object.fromEntries(entries);

    this.database
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

    return this.findById(id);
  }

  setActive(id: string, active: boolean, updatedAt: string): Customer | null {
    this.database
      .prepare(
        `
          UPDATE customers
          SET active = @active,
              updated_at = @updatedAt
          WHERE id = @id
        `
      )
      .run({
        id,
        active: active ? 1 : 0,
        updatedAt
      });

    return this.findById(id);
  }
}

function buildListQuery(filters: CustomerSearchFilters): ListQueryParts {
  const conditions: string[] = [];
  const parameters: Record<string, string | number> = {};

  if (typeof filters.active === 'boolean') {
    conditions.push('active = @active');
    parameters.active = filters.active ? 1 : 0;
  }

  const search = filters.search?.trim();

  if (search) {
    const searchConditions = [
      'legal_name LIKE @searchText COLLATE NOCASE',
      'trade_name LIKE @searchText COLLATE NOCASE',
      'email LIKE @searchText COLLATE NOCASE'
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

function assignIfDefined(
  target: Record<string, string | number | null>,
  column: string,
  value: string | null | undefined
): void {
  if (value !== undefined) {
    target[column] = value;
  }
}
