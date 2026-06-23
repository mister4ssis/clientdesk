import type { DatabaseConnection } from '../../database/database';
import { ErrorCode } from '../../errors/error-codes';
import type { ClientDeskSupabaseClient } from '../../integrations/supabase/supabase-client';
import type { CustomerRepository } from '../customers/customer.repository';
import type { SyncOutboxItem, SyncOutboxRepository } from './sync-outbox.repository';
import { mapCustomerToRemote } from './customer-supabase.mapper';

export interface CustomerSyncResult {
  success: boolean;
  errorCode: string | null;
}

export class CustomerSyncService {
  constructor(
    private readonly database: DatabaseConnection,
    private readonly customerRepository: CustomerRepository,
    private readonly syncOutboxRepository: SyncOutboxRepository,
    private readonly supabaseClient: ClientDeskSupabaseClient | null
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
    const { error } = await this.supabaseClient.from('customers').upsert(mapCustomerToRemote(customer), {
      onConflict: 'id'
    });

    if (error) {
      const errorCode = mapSupabaseError(error.code);
      this.customerRepository.markSyncError(customer.id, errorCode);

      return {
        success: false,
        errorCode
      };
    }

    const syncedAt = new Date().toISOString();
    const transaction = this.database.transaction(() => {
      const synced = this.customerRepository.markSyncedIfUnchanged(
        customer.id,
        expectedUpdatedAt,
        syncedAt
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
