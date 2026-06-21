import type { CreateCustomerInput, UpdateCustomerInput } from '@shared/customers/customer.dto';
import type {
  Customer,
  CustomerListResult,
  CustomerSearchFilters
} from '@shared/customers/customer.types';
import type { IpcResult } from '@shared/ipc/ipc-result';

export class ClientDeskClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ClientDeskClientError';
  }
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  return unwrapIpcResult(await window.clientDesk.customers.create(input));
}

export async function listCustomers(
  filters: CustomerSearchFilters = {}
): Promise<CustomerListResult> {
  return unwrapIpcResult(await window.clientDesk.customers.list(filters));
}

export async function getCustomerById(id: string): Promise<Customer> {
  return unwrapIpcResult(await window.clientDesk.customers.getById(id));
}

export async function updateCustomer(
  id: string,
  data: UpdateCustomerInput
): Promise<Customer> {
  return unwrapIpcResult(await window.clientDesk.customers.update(id, data));
}

export async function setCustomerActive(id: string, active: boolean): Promise<Customer> {
  return unwrapIpcResult(await window.clientDesk.customers.setActive(id, active));
}

function unwrapIpcResult<TData>(result: IpcResult<TData>): TData {
  if (result.success) {
    return result.data;
  }

  throw new ClientDeskClientError(result.error.code, result.error.message, result.error.details);
}
