import type {
  CustomerAuditFiltersDto,
  CustomerAuditListResultDto
} from '@shared/audit/audit.types';
import type { IpcResult } from '@shared/ipc/ipc-result';

export class ClientDeskAuditError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ClientDeskAuditError';
  }
}

export async function listCustomerHistory(
  customerId: string,
  filters: CustomerAuditFiltersDto = {}
): Promise<CustomerAuditListResultDto> {
  return unwrapIpcResult(await window.clientDesk.audit.listCustomerHistory(customerId, filters));
}

function unwrapIpcResult<TData>(result: IpcResult<TData>): TData {
  if (result.success) {
    return result.data;
  }

  throw new ClientDeskAuditError(result.error.code, result.error.message, result.error.details);
}
