import type { Customer } from '@shared/customers/customer.types';
import type { RemoteCustomerInsert } from '../../integrations/supabase/database.types';

export function mapCustomerToRemote(customer: Customer): RemoteCustomerInsert {
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
    updated_at: customer.updatedAt
  };
}
