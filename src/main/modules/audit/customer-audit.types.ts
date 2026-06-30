import type {
  CustomerAuditFiltersDto,
  CustomerAuditOperation,
  CustomerAuditSource
} from '@shared/audit/audit.types';

export interface CustomerAuditRecordInput {
  customerId: string;
  operation: CustomerAuditOperation;
  source: CustomerAuditSource;
  changedFields?: string[];
  userId: string;
  installationId: string;
  localVersion?: string | null;
  remoteVersion?: number | null;
  createdAt?: string;
}

export interface CustomerAuditQueryFilters extends CustomerAuditFiltersDto {
  userId: string;
}

export interface CustomerAuditRow {
  id: string;
  customer_id: string;
  operation: CustomerAuditOperation;
  source: CustomerAuditSource;
  changed_fields: string | null;
  user_id: string;
  installation_id: string;
  local_version: string | null;
  remote_version: number | null;
  created_at: string;
}
