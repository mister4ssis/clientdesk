import type { DatabaseConnection } from '../../database/database';
import { ErrorCode } from '../../errors/error-codes';
import type { ClientDeskSupabaseClient } from '../../integrations/supabase/supabase-client';
import type { CustomerRepository } from '../customers/customer.repository';
import type { SyncOutboxItem, SyncOutboxRepository } from './sync-outbox.repository';
import {
  mapCustomerToConflictSnapshot,
  mapCustomerToRemote,
  mapRemoteCustomerToSnapshot
} from './customer-supabase.mapper';
import type { SyncConflictRepository } from './sync-conflict.repository';
import type { Customer } from '@shared/customers/customer.types';

export interface CustomerSyncResult {
  success: boolean;
  errorCode: string | null;
}

export class CustomerSyncService {
  constructor(
    private readonly database: DatabaseConnection,
    private readonly customerRepository: CustomerRepository,
    private readonly syncOutboxRepository: SyncOutboxRepository,
    private readonly supabaseClient: ClientDeskSupabaseClient | null,
    private readonly syncConflictRepository?: SyncConflictRepository
  ) {}

  async syncCustomer(item: SyncOutboxItem): Promise<CustomerSyncResult> {
    if (!this.supabaseClient) {
      return {
        success: false,
        errorCode: ErrorCode.SyncConfigurationError
      };
    }

    const customer = this.customerRepository.findById(item.entityId);

    if (!customer) {
      this.syncOutboxRepository.remove(item.id);

      return {
        success: true,
        errorCode: null
      };
    }

    const expectedUpdatedAt = customer.updatedAt;
    const result = await this.pushCustomer(customer);

    if (!result.success) {
      const errorCode = result.errorCode ?? ErrorCode.SyncRemoteError;
      this.customerRepository.markSyncError(customer.id, errorCode);

      return {
        success: false,
        errorCode
      };
    }

    if (result.conflict) {
      this.customerRepository.markConflict(customer.id, ErrorCode.SyncConflict);
      this.registerConflict(customer, result.conflict);

      return {
        success: false,
        errorCode: ErrorCode.SyncConflict
      };
    }

    const syncedAt = new Date().toISOString();
    const transaction = this.database.transaction(() => {
      const synced = this.customerRepository.markSyncedIfUnchanged(
        customer.id,
        expectedUpdatedAt,
        syncedAt,
        result.remoteVersion,
        result.remoteUpdatedAt
      );

      if (synced) {
        this.syncOutboxRepository.remove(item.id);
      } else {
        this.syncOutboxRepository.enqueueCustomer(customer.id, syncedAt);
      }
    });

    transaction();

    return {
      success: true,
      errorCode: null
    };
  }

  async pushCustomer(customer: Customer, expectedVersionOverride?: number | null): Promise<{
    success: boolean;
    errorCode: string | null;
    remoteVersion?: number;
    remoteUpdatedAt?: string;
    conflict?: ReturnType<typeof mapRemoteCustomerToSnapshot>;
  }> {
    if (!this.supabaseClient) {
      return {
        success: false,
        errorCode: ErrorCode.SyncConfigurationError
      };
    }

    const metadata = this.customerRepository.getSyncMetadata(customer.id);
    const { data, error } = await this.supabaseClient.rpc('sync_upsert_customer', {
      customer_data: mapCustomerToRemote(customer),
      expected_version: expectedVersionOverride ?? metadata?.remoteVersion ?? null
    });

    if (error) {
      return {
        success: false,
        errorCode: mapSupabaseError(error.code)
      };
    }

    const firstResult = data?.[0];

    if (!firstResult) {
      return {
        success: false,
        errorCode: ErrorCode.SyncRemoteError
      };
    }

    if (firstResult.result === 'CONFLICT') {
      return {
        success: true,
        errorCode: ErrorCode.SyncConflict,
        conflict: mapRemoteCustomerToSnapshot(firstResult.remote_customer)
      };
    }

    return {
      success: true,
      errorCode: null,
      remoteVersion: firstResult.remote_version,
      remoteUpdatedAt: firstResult.remote_updated_at
    };
  }

  private registerConflict(
    customer: Customer,
    remoteData: ReturnType<typeof mapRemoteCustomerToSnapshot>
  ): void {
    const metadata = this.customerRepository.getSyncMetadata(customer.id);

    if (!metadata || !this.syncConflictRepository) {
      return;
    }

    this.syncConflictRepository.upsertCustomerConflict({
      entityId: customer.id,
      localData: mapCustomerToConflictSnapshot(customer, metadata),
      remoteData,
      localUpdatedAt: customer.updatedAt,
      remoteUpdatedAt: remoteData.remoteUpdatedAt ?? remoteData.updatedAt,
      remoteVersion: remoteData.remoteVersion ?? 0
    });
  }
}

function mapSupabaseError(code: string | undefined): string {
  if (code === '23505') {
    return ErrorCode.SyncDuplicateTaxId;
  }

  if (code === '42501' || code === 'PGRST301') {
    return ErrorCode.SyncAuthError;
  }

  if (code?.startsWith('23')) {
    return ErrorCode.SyncValidationError;
  }

  return ErrorCode.SyncRemoteError;
}
