import type {
  SyncConflictDetails,
  SyncConflictSummary
} from '@shared/sync/sync.types';
import type { DatabaseConnection } from '../../database/database';
import { ApplicationError } from '../../errors/application-error';
import { ErrorCode } from '../../errors/error-codes';
import type { CustomerRepository } from '../customers/customer.repository';
import type { CustomerSyncService } from './customer-sync.service';
import type { SyncConflictRepository } from './sync-conflict.repository';
import type { SyncOutboxRepository } from './sync-outbox.repository';

export class CustomerConflictService {
  constructor(
    private readonly database: DatabaseConnection,
    private readonly customerRepository: CustomerRepository,
    private readonly syncOutboxRepository: SyncOutboxRepository,
    private readonly syncConflictRepository: SyncConflictRepository,
    private readonly customerSyncService: CustomerSyncService
  ) {}

  listConflicts(): SyncConflictSummary[] {
    return this.syncConflictRepository.listPending();
  }

  getConflict(id: string): SyncConflictDetails {
    const conflict = this.syncConflictRepository.findPendingById(id);

    if (!conflict) {
      throw new ApplicationError(ErrorCode.SyncConflictNotFound, 'Conflito não encontrado.');
    }

    return conflict;
  }

  async resolveKeepLocal(id: string): Promise<SyncConflictDetails> {
    const conflict = this.getConflict(id);
    const customer = this.customerRepository.findById(conflict.entityId);

    if (!customer) {
      throw new ApplicationError(ErrorCode.CustomerNotFound, 'Cliente não encontrado.');
    }

    const pushResult = await this.customerSyncService.pushCustomer(
      customer,
      conflict.remoteVersion
    );

    if (!pushResult.success || pushResult.conflict) {
      throw new ApplicationError(ErrorCode.SyncConflict, 'Conflito remoto ainda pendente.');
    }

    const resolvedAt = new Date().toISOString();
    const transaction = this.database.transaction(() => {
      this.customerRepository.markSyncedIfUnchanged(
        customer.id,
        customer.updatedAt,
        resolvedAt,
        pushResult.remoteVersion,
        pushResult.remoteUpdatedAt
      );
      this.syncOutboxRepository.removeCustomer(customer.id);
      this.syncConflictRepository.markResolved(id, 'RESOLVED_LOCAL', resolvedAt);
      this.customerRepository.recordConflictResolutionAudit({
        customerId: customer.id,
        operation: 'CONFLICT_KEEP_LOCAL',
        changedFields: getConflictChangedFields(conflict),
        localVersion: customer.updatedAt,
        remoteVersion: pushResult.remoteVersion ?? conflict.remoteVersion,
        createdAt: resolvedAt
      });
    });

    transaction();

    return {
      ...conflict,
      status: 'RESOLVED_LOCAL'
    };
  }

  resolveUseRemote(id: string): SyncConflictDetails {
    const conflict = this.getConflict(id);
    const resolvedAt = new Date().toISOString();
    const transaction = this.database.transaction(() => {
      this.customerRepository.applyRemoteCustomer(conflict.remoteData);
      this.syncOutboxRepository.removeCustomer(conflict.entityId);
      this.syncConflictRepository.markResolved(id, 'RESOLVED_REMOTE', resolvedAt);
      this.customerRepository.recordConflictResolutionAudit({
        customerId: conflict.entityId,
        operation: 'CONFLICT_USE_REMOTE',
        changedFields: getConflictChangedFields(conflict),
        localVersion: conflict.remoteData.updatedAt,
        remoteVersion: conflict.remoteVersion,
        createdAt: resolvedAt
      });
    });

    transaction();

    return {
      ...conflict,
      status: 'RESOLVED_REMOTE'
    };
  }
}

function getConflictChangedFields(conflict: SyncConflictDetails): string[] {
  return [
    'personType',
    'legalName',
    'tradeName',
    'representative',
    'taxId',
    'email',
    'phone',
    'birthDate',
    'postalCode',
    'street',
    'addressNumber',
    'addressComplement',
    'neighborhood',
    'city',
    'state',
    'notes',
    'active'
  ].filter((field) => {
    const key = field as keyof SyncConflictDetails['localData'];

    return conflict.localData[key] !== conflict.remoteData[key];
  });
}
