import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseConnection } from '@main/database/database';
import { CustomerAuditRepository } from '@main/modules/audit/customer-audit.repository';
import { CustomerRepository } from '@main/modules/customers/customer.repository';
import type { Customer } from '@shared/customers/customer.types';
import { createMigratedMemoryDatabase } from '../../helpers/test-database';

const createdAt = '2026-06-21T10:00:00.000Z';
const updatedAt = '2026-06-21T10:00:00.000Z';

let database: DatabaseConnection | null;
let repository: CustomerRepository;

beforeEach(() => {
  database = createMigratedMemoryDatabase();
  repository = new CustomerRepository(database);
});

afterEach(() => {
  if (database?.open) {
    database.close();
  }

  database = null;
});

describe('CustomerRepository', () => {
  it('creates and finds a customer by ID', () => {
    const customer = repository.create(makeCustomer({ id: 'customer-1' }));

    expect(customer.id).toBe('customer-1');
    expect(repository.findById('customer-1')).toMatchObject({
      id: 'customer-1',
      legalName: 'Maria Silva',
      active: true
    });
  });

  it('finds a customer by CPF/CNPJ', () => {
    repository.create(makeCustomer({ id: 'customer-1', taxId: '12345678901' }));

    expect(repository.findByTaxId('12345678901')?.id).toBe('customer-1');
  });

  it('lists customers ordered by legal name', () => {
    repository.create(makeCustomer({ id: 'customer-2', legalName: 'Zenith Ltda' }));
    repository.create(makeCustomer({ id: 'customer-1', legalName: 'Alpha Ltda' }));

    const result = repository.list();

    expect(result.total).toBe(2);
    expect(result.items.map((customer) => customer.legalName)).toEqual(['Alpha Ltda', 'Zenith Ltda']);
  });

  it('searches by name case-insensitively', () => {
    repository.create(makeCustomer({ id: 'customer-1', legalName: 'Maria Silva' }));
    repository.create(makeCustomer({ id: 'customer-2', legalName: 'Carlos Souza' }));

    const result = repository.list({ search: 'maria' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('customer-1');
  });

  it('searches by CPF/CNPJ', () => {
    repository.create(makeCustomer({ id: 'customer-1', taxId: '12345678901' }));
    repository.create(makeCustomer({ id: 'customer-2', taxId: '98765432100' }));

    const result = repository.list({ search: '123.456' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('customer-1');
  });

  it('searches by representative case-insensitively', () => {
    repository.create(makeCustomer({ id: 'customer-1', representative: 'Ana Souza' }));
    repository.create(makeCustomer({ id: 'customer-2', representative: 'Carlos Lima' }));

    const result = repository.list({ search: 'ana' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('customer-1');
  });

  it('searches text containing LIKE wildcard characters literally', () => {
    repository.create(makeCustomer({ id: 'customer-1', legalName: 'Cliente 100% Ficticio' }));
    repository.create(makeCustomer({ id: 'customer-2', legalName: 'Cliente 100 Ficticio' }));

    const result = repository.list({ search: '100%' });

    expect(result.items.map((customer) => customer.id)).toEqual(['customer-1']);
  });

  it('filters active and inactive customers', () => {
    repository.create(makeCustomer({ id: 'customer-1', active: true }));
    repository.create(makeCustomer({ id: 'customer-2', active: false }));

    expect(repository.list({ active: true }).items.map((customer) => customer.id)).toEqual([
      'customer-1'
    ]);
    expect(repository.list({ active: false }).items.map((customer) => customer.id)).toEqual([
      'customer-2'
    ]);
  });

  it('updates a customer', () => {
    repository.create(makeCustomer({ id: 'customer-1', legalName: 'Maria Silva' }));

    const updated = repository.update('customer-1', {
      legalName: 'Maria Souza',
      representative: 'Ana Souza',
      email: 'maria@example.com',
      updatedAt: '2026-06-21T11:00:00.000Z'
    });

    expect(updated).toMatchObject({
      id: 'customer-1',
      legalName: 'Maria Souza',
      representative: 'Ana Souza',
      email: 'maria@example.com',
      createdAt,
      updatedAt: '2026-06-21T11:00:00.000Z'
    });
  });

  it('records audit entries for local changes without personal values', () => {
    const auditRepository = new CustomerAuditRepository(database as DatabaseConnection);
    repository = new CustomerRepository(database as DatabaseConnection, {
      customerAuditRepository: auditRepository,
      getAuditContext: () => ({
        userId: '11111111-1111-4111-8111-111111111111',
        installationId: '22222222-2222-4222-8222-222222222222'
      })
    });

    repository.create(makeCustomer({ id: 'customer-1', legalName: 'Maria Silva' }));
    repository.update('customer-1', {
      legalName: 'Maria Souza',
      phone: '11999999999',
      updatedAt: '2026-06-21T11:00:00.000Z'
    });

    const history = auditRepository.listByCustomer('customer-1', {
      userId: '11111111-1111-4111-8111-111111111111',
      limit: 10,
      offset: 0
    });

    expect(history.items.map((entry) => entry.operation)).toEqual(['UPDATED', 'CREATED']);
    expect(history.items[0]?.changedFields).toEqual(['legalName', 'phone']);
    expect(JSON.stringify(history)).not.toContain('Maria Souza');
    expect(JSON.stringify(history)).not.toContain('11999999999');
  });

  it('rolls back a local change when mandatory audit recording fails', () => {
    repository = new CustomerRepository(database as DatabaseConnection, {
      customerAuditRepository: {
        record: () => {
          throw new Error('audit failed');
        }
      } as unknown as CustomerAuditRepository,
      getAuditContext: () => ({
        userId: '11111111-1111-4111-8111-111111111111',
        installationId: '22222222-2222-4222-8222-222222222222'
      })
    });

    expect(() => repository.create(makeCustomer({ id: 'customer-1' }))).toThrow('audit failed');
    expect(repository.findById('customer-1')).toBeNull();
  });

  it('activates and deactivates a customer', () => {
    repository.create(makeCustomer({ id: 'customer-1', active: true }));

    expect(repository.setActive('customer-1', false, '2026-06-21T11:00:00.000Z')?.active).toBe(
      false
    );
    expect(repository.setActive('customer-1', true, '2026-06-21T12:00:00.000Z')?.active).toBe(
      true
    );
  });

  it('paginates with limit and offset', () => {
    repository.create(makeCustomer({ id: 'customer-1', legalName: 'Alpha' }));
    repository.create(makeCustomer({ id: 'customer-2', legalName: 'Beta' }));
    repository.create(makeCustomer({ id: 'customer-3', legalName: 'Gamma' }));

    const result = repository.list({ limit: 1, offset: 1 });

    expect(result.total).toBe(3);
    expect(result.items.map((customer) => customer.id)).toEqual(['customer-2']);
  });
});

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'customer-1',
    personType: 'FISICA',
    legalName: 'Maria Silva',
    tradeName: null,
    representative: null,
    taxId: null,
    email: null,
    phone: null,
    birthDate: null,
    postalCode: null,
    street: null,
    addressNumber: null,
    addressComplement: null,
    neighborhood: null,
    city: null,
    state: null,
    notes: null,
    active: true,
    createdAt,
    updatedAt,
    ...overrides
  };
}
