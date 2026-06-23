import { ErrorCode } from '../../errors/error-codes';
import type { ClientDeskSupabaseClient } from '../../integrations/supabase/supabase-client';
import type { SupabaseSyncConfig } from '../../integrations/supabase/supabase-config';
import type { RemoteCustomerRow } from '../../integrations/supabase/database.types';
import type { CustomerRepository } from '../customers/customer.repository';
import type { SyncOutboxRepository } from './sync-outbox.repository';
import type { SyncConflictRepository } from './sync-conflict.repository';
import type { SyncCursorRepository } from './sync-cursor.repository';
import { CUSTOMERS_CURSOR_SCOPE } from './sync-cursor.repository';
import {
  mapCustomerToConflictSnapshot,
  mapRemoteCustomerToSnapshot
} from './customer-supabase.mapper';

export interface CustomerPullResult {
  success: boolean;
  pulledCount: number;
  conflictCount: number;
  errorCode: string | null;
}

const maxBatchesPerCycle = 10;

export class CustomerPullService {
  constructor(
    private readonly config: SupabaseSyncConfig,
    private readonly supabaseClient: ClientDeskSupabaseClient | null,
    private readonly customerRepository: CustomerRepository,
    private readonly syncOutboxRepository: SyncOutboxRepository,
    private readonly syncCursorRepository: SyncCursorRepository,
    private readonly syncConflictRepository: SyncConflictRepository
  ) {}

  async pullRemoteChanges(): Promise<CustomerPullResult> {
    if (!this.config.pullEnabled) {
      return {
        success: true,
        pulledCount: 0,
        conflictCount: 0,
        errorCode: ErrorCode.SyncPullDisabled
      };
    }

    if (!this.supabaseClient) {
      return {
        success: false,
        pulledCount: 0,
        conflictCount: 0,
        errorCode: ErrorCode.SyncConfigurationError
      };
    }

    let pulledCount = 0;
    let conflictCount = 0;

    for (let batchIndex = 0; batchIndex < maxBatchesPerCycle; batchIndex += 1) {
      const cursor = this.syncCursorRepository.getOrCreate(CUSTOMERS_CURSOR_SCOPE);
      const { rows, errorCode } = await this.fetchRemoteBatch(cursor);

      if (errorCode) {
        return {
          success: false,
          pulledCount,
          conflictCount,
          errorCode
        };
      }

      if (rows.length === 0) {
        return {
          success: true,
          pulledCount,
          conflictCount,
          errorCode: null
        };
      }

      for (const row of rows) {
        if (!isValidRemoteCustomer(row)) {
          return {
            success: false,
            pulledCount,
            conflictCount,
            errorCode: ErrorCode.SyncValidationError
          };
        }

        const applied = this.applyRemoteRow(row);
        pulledCount += applied.applied ? 1 : 0;
        conflictCount += applied.conflict ? 1 : 0;
      }

      const lastRow = rows.at(-1);

      if (lastRow) {
        this.syncCursorRepository.update(
          CUSTOMERS_CURSOR_SCOPE,
          lastRow.updated_at,
          lastRow.id
        );
      }

      if (rows.length < this.config.pullBatchSize) {
        break;
      }
    }

    return {
      success: true,
      pulledCount,
      conflictCount,
      errorCode: null
    };
  }

  private async fetchRemoteBatch(cursor: {
    lastRemoteUpdatedAt: string | null;
    lastRemoteId: string | null;
  }): Promise<{ rows: RemoteCustomerRow[]; errorCode: string | null }> {
    let query = this.supabaseClient!
      .from('customers')
      .select('*')
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(this.config.pullBatchSize);

    if (cursor.lastRemoteUpdatedAt && cursor.lastRemoteId) {
      query = query.or(
        `updated_at.gt.${cursor.lastRemoteUpdatedAt},and(updated_at.eq.${cursor.lastRemoteUpdatedAt},id.gt.${cursor.lastRemoteId})`
      );
    }

    const { data, error } = await query;

    if (error) {
      return {
        rows: [],
        errorCode: mapPullError(error.code)
      };
    }

    return {
      rows: data ?? [],
      errorCode: null
    };
  }

  private applyRemoteRow(remoteCustomer: RemoteCustomerRow): { applied: boolean; conflict: boolean } {
    const localCustomer = this.customerRepository.findById(remoteCustomer.id);
    const localMetadata = this.customerRepository.getSyncMetadata(remoteCustomer.id);
    const hasPendingLocalChange = this.syncOutboxRepository.hasPendingCustomer(remoteCustomer.id);
    const remoteSnapshot = mapRemoteCustomerToSnapshot(remoteCustomer);
    const localRemoteVersion = localMetadata?.remoteVersion ?? 0;

    if (localCustomer && hasPendingLocalChange && remoteCustomer.version > localRemoteVersion) {
      this.syncConflictRepository.upsertCustomerConflict({
        entityId: localCustomer.id,
        localData: mapCustomerToConflictSnapshot(localCustomer, {
          deletedAt: localMetadata?.deletedAt ?? null,
          remoteVersion: localMetadata?.remoteVersion ?? null,
          remoteUpdatedAt: localMetadata?.remoteUpdatedAt ?? null
        }),
        remoteData: remoteSnapshot,
        localUpdatedAt: localCustomer.updatedAt,
        remoteUpdatedAt: remoteCustomer.updated_at,
        remoteVersion: remoteCustomer.version
      });
      this.customerRepository.markConflict(localCustomer.id, ErrorCode.SyncConflict);

      return {
        applied: false,
        conflict: true
      };
    }

    if (hasPendingLocalChange) {
      return {
        applied: false,
        conflict: false
      };
    }

    this.customerRepository.applyRemoteCustomer(remoteSnapshot);

    return {
      applied: true,
      conflict: false
    };
  }
}

function mapPullError(code: string | undefined): string {
  if (code === '42501' || code === 'PGRST301') {
    return ErrorCode.SyncAuthError;
  }

  return ErrorCode.SyncRemoteError;
}

function isValidRemoteCustomer(value: RemoteCustomerRow): boolean {
  return (
    typeof value.id === 'string' &&
    (value.person_type === 'FISICA' || value.person_type === 'JURIDICA') &&
    typeof value.legal_name === 'string' &&
    typeof value.updated_at === 'string' &&
    typeof value.version === 'number'
  );
}
