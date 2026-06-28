export type CustomerAuditOperation =
  | 'CREATED'
  | 'UPDATED'
  | 'ACTIVATED'
  | 'DEACTIVATED'
  | 'REMOTE_CREATED'
  | 'REMOTE_UPDATED'
  | 'REMOTE_DELETED'
  | 'CONFLICT_KEEP_LOCAL'
  | 'CONFLICT_USE_REMOTE';

export type CustomerAuditSource =
  | 'LOCAL_USER'
  | 'REMOTE_SYNC'
  | 'CONFLICT_RESOLUTION'
  | 'SYSTEM';

export interface CustomerAuditEntryDto {
  id: string;
  customerId: string;
  operation: CustomerAuditOperation;
  source: CustomerAuditSource;
  changedFields: string[];
  installationIdShort: string;
  createdAt: string;
}

export interface CustomerAuditFiltersDto {
  operation?: CustomerAuditOperation;
  source?: CustomerAuditSource;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface CustomerAuditListResultDto {
  items: CustomerAuditEntryDto[];
  total: number;
}
