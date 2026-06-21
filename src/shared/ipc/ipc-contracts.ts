import type { CustomerDto, CreateCustomerDto, UpdateCustomerDto } from '../customers/customer.dto';
import type { IpcResult } from './ipc-result';

export interface CustomerListQuery {
  search?: string;
  status: 'active' | 'inactive' | 'all';
}

export interface CustomerSetActiveInput {
  id: string;
  active: boolean;
}

export interface IpcContracts {
  'customers:create': {
    input: CreateCustomerDto;
    output: IpcResult<CustomerDto>;
  };
  'customers:list': {
    input: CustomerListQuery;
    output: IpcResult<CustomerDto[]>;
  };
  'customers:get-by-id': {
    input: { id: string };
    output: IpcResult<CustomerDto>;
  };
  'customers:update': {
    input: { id: string; data: UpdateCustomerDto };
    output: IpcResult<CustomerDto>;
  };
  'customers:set-active': {
    input: CustomerSetActiveInput;
    output: IpcResult<CustomerDto>;
  };
}
