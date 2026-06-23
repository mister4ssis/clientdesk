import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureDatabase, type DatabaseConnection } from '@main/database/database';
import { runMigrations } from '@main/database/migration-runner';
import { ApplicationError } from '@main/errors/application-error';
import { ErrorCode } from '@main/errors/error-codes';
import { CustomerRepository } from '@main/modules/customers/customer.repository';
import { CustomerService } from '@main/modules/customers/customer.service';
import {
  completeCompanyInput,
  completeIndividualInput,
  minimalIndividualInput
} from '../../fixtures/customer-fixtures';
import { createTempDirectory, removeTempDirectory } from '../../helpers/temp-directory';
import path from 'node:path';

let tempDirectory: string;
let databasePath: string;
let database: DatabaseConnection | null;
let service: CustomerService;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-22T10:00:00.000Z'));

  tempDirectory = createTempDirectory('clientdesk-customer-integration-');
  databasePath = path.join(tempDirectory, 'clientdesk-test.sqlite');
  database = openMigratedDatabase(databasePath);
  service = createService(database);
});

afterEach(() => {
  const currentDatabase = database;

  if (currentDatabase?.open) {
    currentDatabase.close();
  }

  database = null;
  removeTempDirectory(tempDirectory);
  vi.useRealTimers();
});

describe('CustomerService + CustomerRepository + SQLite', () => {
  it('covers the core customer lifecycle with a temporary SQLite file', () => {
    const individual = service.create(completeIndividualInput);
    const company = service.create(completeCompanyInput);

    expect(individual.taxId).toBe('12345678901');
    expect(individual.email).toBe('maria.silva@example.test');
    expect(individual.state).toBe('MG');
    expect(service.getById(individual.id)).toMatchObject({
      id: individual.id,
      legalName: 'Maria Silva'
    });

    expect(service.list().total).toBe(2);
    expect(service.list({ search: 'empresa' }).items.map((customer) => customer.id)).toEqual([
      company.id
    ]);
    expect(service.list({ search: '789-01' }).items.map((customer) => customer.id)).toEqual([
      individual.id
    ]);
    expect(service.list({ search: 'maria.silva@example.test' }).items[0]?.id).toBe(individual.id);
    expect(service.list({ search: '(31) 99999' }).items[0]?.id).toBe(individual.id);

    vi.setSystemTime(new Date('2026-06-22T11:00:00.000Z'));
    const updated = service.update(individual.id, {
      legalName: 'Maria Souza',
      phone: '(31) 98888-0001'
    });

    expect(updated.createdAt).toBe('2026-06-22T10:00:00.000Z');
    expect(updated.updatedAt).toBe('2026-06-22T11:00:00.000Z');
    expect(updated.phone).toBe('31988880001');

    expect(service.setActive(individual.id, false).active).toBe(false);
    expect(service.list({ active: false }).items.map((customer) => customer.id)).toContain(
      individual.id
    );
    expect(service.setActive(individual.id, true).active).toBe(true);
    expect(service.list({ active: true }).items.map((customer) => customer.id)).toEqual(
      expect.arrayContaining([individual.id, company.id])
    );

    expectApplicationErrorCode(
      () =>
        service.create({
          ...minimalIndividualInput,
          legalName: 'Documento Duplicado',
          taxId: '123.456.789-01'
        }),
      ErrorCode.CustomerTaxIdAlreadyExists
    );
  });

  it('persists data after closing and reopening the temporary SQLite file', () => {
    const created = service.create(completeIndividualInput);

    const currentDatabase = database;

    if (!currentDatabase) {
      throw new Error('Expected an open test database.');
    }

    currentDatabase.close();
    const reopenedDatabase = openMigratedDatabase(databasePath);
    database = reopenedDatabase;
    service = createService(reopenedDatabase);

    expect(service.getById(created.id)).toMatchObject({
      id: created.id,
      legalName: 'Maria Silva',
      taxId: '12345678901'
    });
    expect(service.list().total).toBe(1);
  });
});

function openMigratedDatabase(filePath: string): DatabaseConnection {
  const connection = new Database(filePath);
  configureDatabase(connection);
  runMigrations(connection, {
    migrationsDirectory: path.resolve('src/main/database/migrations'),
    executedAt: () => '2026-06-22T10:00:00.000Z'
  });

  return connection;
}

function createService(connection: DatabaseConnection): CustomerService {
  return new CustomerService(new CustomerRepository(connection));
}

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
