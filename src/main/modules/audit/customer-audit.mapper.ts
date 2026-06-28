import type { CustomerAuditEntryDto } from '@shared/audit/audit.types';
import type { CustomerAuditRow } from './customer-audit.types';

export function mapCustomerAuditRow(row: CustomerAuditRow): CustomerAuditEntryDto {
  return {
    id: row.id,
    customerId: row.customer_id,
    operation: row.operation,
    source: row.source,
    changedFields: parseChangedFields(row.changed_fields),
    installationIdShort: abbreviateInstallationId(row.installation_id),
    createdAt: row.created_at
  };
}

export function serializeChangedFields(fields: string[] | undefined): string | null {
  const uniqueFields = Array.from(new Set((fields ?? []).filter(Boolean))).sort();

  return uniqueFields.length > 0 ? JSON.stringify(uniqueFields) : null;
}

export function parseChangedFields(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    return [];
  }

  return [];
}

export function abbreviateInstallationId(installationId: string): string {
  return installationId.slice(0, 13);
}
