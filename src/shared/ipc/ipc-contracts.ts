import type {
  CreateCustomerInput,
  CustomerDto,
  CustomerListResultDto,
  CustomerSearchFiltersDto,
  UpdateCustomerInput
} from '../customers/customer.dto';
import type {
  BackupResult,
  BackupValidationResult,
  RestoreResult
} from '../backup/backup.types';
import type { SyncRunResult, SyncStatus } from '../sync/sync.types';
import type { IpcResult } from './ipc-result';

export interface CustomerSetActiveInput {
  id: string;
  active: boolean;
}

export interface CustomerGetByIdInput {
  id: string;
}

export interface CustomerUpdateInput {
  id: string;
  data: UpdateCustomerInput;
}

export interface IpcContracts {
  'app:get-version': {
    input: void;
    output: IpcResult<string>;
  };
  'customers:create': {
    input: CreateCustomerInput;
    output: IpcResult<CustomerDto>;
  };
  'customers:list': {
    input: CustomerSearchFiltersDto;
    output: IpcResult<CustomerListResultDto>;
  };
  'customers:get-by-id': {
    input: CustomerGetByIdInput;
    output: IpcResult<CustomerDto>;
  };
  'customers:update': {
    input: CustomerUpdateInput;
    output: IpcResult<CustomerDto>;
  };
  'customers:set-active': {
    input: CustomerSetActiveInput;
    output: IpcResult<CustomerDto>;
  };
  'backup:create': {
    input: void;
    output: IpcResult<BackupResult>;
  };
  'backup:restore': {
    input: void;
    output: IpcResult<RestoreResult>;
  };
  'backup:validate': {
    input: void;
    output: IpcResult<BackupValidationResult>;
  };
  'sync:get-status': {
    input: void;
    output: IpcResult<SyncStatus>;
  };
  'sync:run-now': {
    input: void;
    output: IpcResult<SyncRunResult>;
  };
}

export interface ClientDeskApi {
  app: {
    getVersion(): Promise<IpcResult<string>>;
  };
  customers: {
    create(input: CreateCustomerInput): Promise<IpcResult<CustomerDto>>;
    list(filters?: CustomerSearchFiltersDto): Promise<IpcResult<CustomerListResultDto>>;
    getById(id: string): Promise<IpcResult<CustomerDto>>;
    update(id: string, data: UpdateCustomerInput): Promise<IpcResult<CustomerDto>>;
    setActive(id: string, active: boolean): Promise<IpcResult<CustomerDto>>;
  };
  backup: {
    create(): Promise<IpcResult<BackupResult>>;
    restore(): Promise<IpcResult<RestoreResult>>;
    validate(): Promise<IpcResult<BackupValidationResult>>;
  };
  sync: {
    getStatus(): Promise<IpcResult<SyncStatus>>;
    runNow(): Promise<IpcResult<SyncRunResult>>;
  };
}
