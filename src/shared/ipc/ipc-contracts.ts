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
import type { AuthState, SignInInput, SignOutResult } from '../auth/auth.types';
import type {
  SyncConflictDetails,
  SyncConflictSummary,
  SyncRunResult,
  SyncStatus
} from '../sync/sync.types';
import type {
  CustomerAuditFiltersDto,
  CustomerAuditListResultDto
} from '../audit/audit.types';
import type {
  DiagnosticsExportResultDto,
  DiagnosticsSummaryDto,
  SyncRunLogDto,
  SyncRunLogFiltersDto
} from '../diagnostics/diagnostics.types';
import type { UpdateOperationResult, UpdateState } from '../update/update.types';
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

export interface SyncConflictInput {
  id: string;
}

export interface CustomerAuditHistoryInput {
  customerId: string;
  filters?: CustomerAuditFiltersDto;
}

export interface IpcContracts {
  'app:get-version': {
    input: void;
    output: IpcResult<string>;
  };
  'auth:get-state': {
    input: void;
    output: IpcResult<AuthState>;
  };
  'auth:sign-in': {
    input: SignInInput;
    output: IpcResult<AuthState>;
  };
  'auth:sign-out': {
    input: void;
    output: IpcResult<SignOutResult>;
  };
  'auth:refresh-session': {
    input: void;
    output: IpcResult<AuthState>;
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
  'sync:list-conflicts': {
    input: void;
    output: IpcResult<SyncConflictSummary[]>;
  };
  'sync:get-conflict': {
    input: SyncConflictInput;
    output: IpcResult<SyncConflictDetails>;
  };
  'sync:resolve-keep-local': {
    input: SyncConflictInput;
    output: IpcResult<SyncConflictDetails>;
  };
  'sync:resolve-use-remote': {
    input: SyncConflictInput;
    output: IpcResult<SyncConflictDetails>;
  };
  'audit:list-customer-history': {
    input: CustomerAuditHistoryInput;
    output: IpcResult<CustomerAuditListResultDto>;
  };
  'diagnostics:get-summary': {
    input: void;
    output: IpcResult<DiagnosticsSummaryDto>;
  };
  'diagnostics:list-sync-runs': {
    input: SyncRunLogFiltersDto;
    output: IpcResult<SyncRunLogDto[]>;
  };
  'diagnostics:export': {
    input: void;
    output: IpcResult<DiagnosticsExportResultDto>;
  };
  'update:get-state': {
    input: void;
    output: IpcResult<UpdateState>;
  };
  'update:check': {
    input: void;
    output: IpcResult<UpdateOperationResult>;
  };
  'update:download': {
    input: void;
    output: IpcResult<UpdateOperationResult>;
  };
  'update:install': {
    input: void;
    output: IpcResult<UpdateOperationResult>;
  };
}

export interface ClientDeskApi {
  app: {
    getVersion(): Promise<IpcResult<string>>;
  };
  auth: {
    getState(): Promise<IpcResult<AuthState>>;
    signIn(email: string, password: string): Promise<IpcResult<AuthState>>;
    signOut(): Promise<IpcResult<SignOutResult>>;
    refreshSession(): Promise<IpcResult<AuthState>>;
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
    listConflicts(): Promise<IpcResult<SyncConflictSummary[]>>;
    getConflict(id: string): Promise<IpcResult<SyncConflictDetails>>;
    resolveKeepLocal(id: string): Promise<IpcResult<SyncConflictDetails>>;
    resolveUseRemote(id: string): Promise<IpcResult<SyncConflictDetails>>;
  };
  audit: {
    listCustomerHistory(
      customerId: string,
      filters?: CustomerAuditFiltersDto
    ): Promise<IpcResult<CustomerAuditListResultDto>>;
  };
  diagnostics: {
    getSummary(): Promise<IpcResult<DiagnosticsSummaryDto>>;
    listSyncRuns(filters?: SyncRunLogFiltersDto): Promise<IpcResult<SyncRunLogDto[]>>;
    export(): Promise<IpcResult<DiagnosticsExportResultDto>>;
  };
  update: {
    getState(): Promise<IpcResult<UpdateState>>;
    check(): Promise<IpcResult<UpdateOperationResult>>;
    download(): Promise<IpcResult<UpdateOperationResult>>;
    install(): Promise<IpcResult<UpdateOperationResult>>;
  };
}
