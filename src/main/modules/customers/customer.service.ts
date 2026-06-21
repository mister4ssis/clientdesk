import type { CustomerRepository } from './customer.repository';
import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { ApplicationError } from '../../errors/application-error';
import { ErrorCode } from '../../errors/error-codes';
import {
  createCustomerSchema,
  customerIdSchema,
  customerSearchFiltersSchema,
  updateCustomerSchema
} from '@shared/customers/customer.schemas';
import type {
  Customer,
  CustomerListResult,
  CustomerSearchFilters
} from '@shared/customers/customer.types';
import type { CreateCustomerInput, UpdateCustomerInput } from '@shared/customers/customer.dto';

export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  isReady(): boolean {
    return this.customerRepository.exists();
  }

  create(input: CreateCustomerInput): Customer {
    const parsedInput = parseOrThrow(() => createCustomerSchema.parse(input));

    if (parsedInput.taxId) {
      this.ensureTaxIdIsAvailable(parsedInput.taxId);
    }

    const now = new Date().toISOString();
    const customer: Customer = {
      ...parsedInput,
      id: randomUUID(),
      tradeName: parsedInput.tradeName ?? null,
      taxId: parsedInput.taxId ?? null,
      email: parsedInput.email ?? null,
      phone: parsedInput.phone ?? null,
      birthDate: parsedInput.birthDate ?? null,
      postalCode: parsedInput.postalCode ?? null,
      street: parsedInput.street ?? null,
      addressNumber: parsedInput.addressNumber ?? null,
      addressComplement: parsedInput.addressComplement ?? null,
      neighborhood: parsedInput.neighborhood ?? null,
      city: parsedInput.city ?? null,
      state: parsedInput.state ?? null,
      notes: parsedInput.notes ?? null,
      active: parsedInput.active,
      createdAt: now,
      updatedAt: now
    };

    return executeRepositoryOperation(() => this.customerRepository.create(customer));
  }

  getById(id: string): Customer {
    const parsedId = parseOrThrow(() => customerIdSchema.parse(id));
    const customer = executeRepositoryOperation(() => this.customerRepository.findById(parsedId));

    if (!customer) {
      throw new ApplicationError(ErrorCode.CustomerNotFound, 'Cliente não encontrado.');
    }

    return customer;
  }

  list(filters: CustomerSearchFilters = {}): CustomerListResult {
    const parsedFilters = parseOrThrow(() => customerSearchFiltersSchema.parse(filters));

    return executeRepositoryOperation(() => this.customerRepository.list(parsedFilters));
  }

  update(id: string, input: UpdateCustomerInput): Customer {
    const parsedId = parseOrThrow(() => customerIdSchema.parse(id));
    const currentCustomer = this.getById(parsedId);
    const parsedInput = parseOrThrow(() => updateCustomerSchema.parse(input));
    const mergedInput = parseOrThrow(() =>
      createCustomerSchema.parse({
        ...toEditableInput(currentCustomer),
        ...parsedInput
      })
    );

    if (mergedInput.taxId) {
      this.ensureTaxIdIsAvailable(mergedInput.taxId, currentCustomer.id);
    }

    const updatedCustomer = executeRepositoryOperation(() =>
      this.customerRepository.update(parsedId, {
        ...parsedInput,
        updatedAt: new Date().toISOString()
      })
    );

    if (!updatedCustomer) {
      throw new ApplicationError(ErrorCode.CustomerNotFound, 'Cliente não encontrado.');
    }

    return updatedCustomer;
  }

  setActive(id: string, active: boolean): Customer {
    const parsedId = parseOrThrow(() => customerIdSchema.parse(id));
    const parsedActive = parseOrThrow(() => createActiveSchema().parse(active));
    const currentCustomer = executeRepositoryOperation(() =>
      this.customerRepository.findById(parsedId)
    );

    if (!currentCustomer) {
      throw new ApplicationError(ErrorCode.CustomerNotFound, 'Cliente não encontrado.');
    }

    const updatedCustomer = executeRepositoryOperation(() =>
      this.customerRepository.setActive(parsedId, parsedActive, new Date().toISOString())
    );

    if (!updatedCustomer) {
      throw new ApplicationError(ErrorCode.CustomerNotFound, 'Cliente não encontrado.');
    }

    return updatedCustomer;
  }

  private ensureTaxIdIsAvailable(taxId: string, ignoredCustomerId?: string): void {
    const existingCustomer = executeRepositoryOperation(() => this.customerRepository.findByTaxId(taxId));

    if (existingCustomer && existingCustomer.id !== ignoredCustomerId) {
      throw new ApplicationError(
        ErrorCode.CustomerTaxIdAlreadyExists,
        'CPF/CNPJ já associado a outro cliente.'
      );
    }
  }
}

function parseOrThrow<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApplicationError(ErrorCode.ValidationError, 'Dados inválidos.', {
        details: error.flatten()
      });
    }

    throw error;
  }
}

function executeRepositoryOperation<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }

    throw new ApplicationError(ErrorCode.DatabaseError, 'Erro ao acessar o banco de dados.', {
      cause: error
    });
  }
}

function toEditableInput(customer: Customer): CreateCustomerInput {
  return {
    personType: customer.personType,
    legalName: customer.legalName,
    tradeName: customer.tradeName,
    taxId: customer.taxId,
    email: customer.email,
    phone: customer.phone,
    birthDate: customer.birthDate,
    postalCode: customer.postalCode,
    street: customer.street,
    addressNumber: customer.addressNumber,
    addressComplement: customer.addressComplement,
    neighborhood: customer.neighborhood,
    city: customer.city,
    state: customer.state,
    notes: customer.notes,
    active: customer.active
  };
}

function createActiveSchema() {
  return z.boolean();
}
