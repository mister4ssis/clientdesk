import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseConnection } from '@main/database/database';
import { ApplicationError } from '@main/errors/application-error';
import { ErrorCode } from '@main/errors/error-codes';
import { CustomerRepository } from '@main/modules/customers/customer.repository';
import { CustomerService } from '@main/modules/customers/customer.service';
import { createMigratedMemoryDatabase } from '../../helpers/test-database';

let database: DatabaseConnection | null;
let service: CustomerService;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-21T10:00:00.000Z'));

  database = createMigratedMemoryDatabase();
  service = new CustomerService(new CustomerRepository(database));
});

afterEach(() => {
  if (database?.open) {
    database.close();
  }

  database = null;
  vi.useRealTimers();
});

describe('CustomerService', () => {
  it('creates a valid customer with UUID and timestamps', () => {
    const customer = service.create({
      personType: 'FISICA',
      legalName: 'Maria Silva',
      taxId: '123.456.789-01'
    });

    expect(customer.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(customer.taxId).toBe('12345678901');
    expect(customer.createdAt).toBe('2026-06-21T10:00:00.000Z');
    expect(customer.updatedAt).toBe('2026-06-21T10:00:00.000Z');
    expect(customer.active).toBe(true);
  });

  it('prevents duplicated CPF/CNPJ on create', () => {
    service.create({
      personType: 'FISICA',
      legalName: 'Maria Silva',
      taxId: '12345678901'
    });

    expectApplicationErrorCode(
      () =>
        service.create({
          personType: 'FISICA',
          legalName: 'Maria Souza',
          taxId: '123.456.789-01'
        }),
      ErrorCode.CustomerTaxIdAlreadyExists
    );
  });

  it('gets a customer by ID', () => {
    const created = service.create({
      personType: 'JURIDICA',
      legalName: 'ClientDesk Tecnologia Ltda',
      taxId: '12.345.678/0001-90'
    });

    expect(service.getById(created.id)).toMatchObject({
      id: created.id,
      legalName: 'ClientDesk Tecnologia Ltda'
    });
  });

  it('returns CUSTOMER_NOT_FOUND for missing customer', () => {
    expectApplicationErrorCode(
      () => service.getById('00000000-0000-4000-8000-000000000000'),
      ErrorCode.CustomerNotFound
    );
  });

  it('updates a customer without changing createdAt', () => {
    const created = service.create({
      personType: 'FISICA',
      legalName: 'Maria Silva',
      taxId: '12345678901'
    });

    vi.setSystemTime(new Date('2026-06-21T11:00:00.000Z'));

    const updated = service.update(created.id, {
      legalName: 'Maria Souza',
      email: ' MARIA@EXAMPLE.COM '
    });

    expect(updated.legalName).toBe('Maria Souza');
    expect(updated.email).toBe('maria@example.com');
    expect(updated.createdAt).toBe('2026-06-21T10:00:00.000Z');
    expect(updated.updatedAt).toBe('2026-06-21T11:00:00.000Z');
  });

  it('prevents duplicated CPF/CNPJ during update', () => {
    const first = service.create({
      personType: 'FISICA',
      legalName: 'Maria Silva',
      taxId: '12345678901'
    });
    const second = service.create({
      personType: 'FISICA',
      legalName: 'Carlos Souza',
      taxId: '98765432100'
    });

    expect(first.id).not.toBe(second.id);
    expectApplicationErrorCode(
      () => service.update(second.id, { taxId: '123.456.789-01' }),
      ErrorCode.CustomerTaxIdAlreadyExists
    );
  });

  it('activates and deactivates a customer', () => {
    const created = service.create({
      personType: 'FISICA',
      legalName: 'Maria Silva'
    });

    expect(service.setActive(created.id, false).active).toBe(false);
    expect(service.setActive(created.id, true).active).toBe(true);
  });

  it('rejects invalid input', () => {
    expectApplicationErrorCode(
      () =>
        service.create({
          personType: 'FISICA',
          legalName: 'A',
          email: 'invalid-email'
        }),
      ErrorCode.ValidationError
    );
  });
});

function expectApplicationErrorCode(operation: () => unknown, expectedCode: ErrorCode): void {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(ApplicationError);
    expect((error as ApplicationError).code).toBe(expectedCode);
    return;
  }

  throw new Error(`Expected ApplicationError with code ${expectedCode}.`);
}
