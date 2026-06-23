import type { Customer } from '@shared/customers/customer.types';
import type {
  RemoteCustomerRow,
  RemoteCustomerRpcPayload
} from '../../integrations/supabase/database.types';
import type { CustomerConflictSnapshot } from '@shared/sync/sync.types';

export function mapCustomerToRemote(customer: Customer): RemoteCustomerRpcPayload {
  return {
    id: customer.id,
    person_type: customer.personType,
    legal_name: customer.legalName,
    trade_name: customer.tradeName,
    representative: customer.representative,
    tax_id: customer.taxId,
    email: customer.email,
    phone: customer.phone,
    birth_date: customer.birthDate,
    postal_code: customer.postalCode,
    street: customer.street,
    address_number: customer.addressNumber,
    address_complement: customer.addressComplement,
    neighborhood: customer.neighborhood,
    city: customer.city,
    state: customer.state,
    notes: customer.notes,
    active: customer.active,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
    deleted_at: null
  };
}

export function mapRemoteCustomerToSnapshot(remoteCustomer: RemoteCustomerRow): CustomerConflictSnapshot {
  return {
    id: remoteCustomer.id,
    personType: remoteCustomer.person_type,
    legalName: remoteCustomer.legal_name,
    tradeName: remoteCustomer.trade_name,
    representative: remoteCustomer.representative,
    taxId: remoteCustomer.tax_id,
    email: remoteCustomer.email,
    phone: remoteCustomer.phone,
    birthDate: remoteCustomer.birth_date,
    postalCode: remoteCustomer.postal_code,
    street: remoteCustomer.street,
    addressNumber: remoteCustomer.address_number,
    addressComplement: remoteCustomer.address_complement,
    neighborhood: remoteCustomer.neighborhood,
    city: remoteCustomer.city,
    state: remoteCustomer.state,
    notes: remoteCustomer.notes,
    active: remoteCustomer.active,
    createdAt: remoteCustomer.created_at,
    updatedAt: remoteCustomer.updated_at,
    deletedAt: remoteCustomer.deleted_at,
    remoteVersion: remoteCustomer.version,
    remoteUpdatedAt: remoteCustomer.updated_at
  };
}

export function mapCustomerToConflictSnapshot(
  customer: Customer,
  metadata: {
    deletedAt: string | null;
    remoteVersion: number | null;
    remoteUpdatedAt: string | null;
  }
): CustomerConflictSnapshot {
  return {
    ...customer,
    deletedAt: metadata.deletedAt,
    remoteVersion: metadata.remoteVersion,
    remoteUpdatedAt: metadata.remoteUpdatedAt
  };
}
