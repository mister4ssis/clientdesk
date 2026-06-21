import type { Customer, PersonType } from '@shared/customers/customer.types';

export const CUSTOMER_TABLE_NAME = 'customers';

export interface CustomerRow {
  id: string;
  person_type: PersonType;
  legal_name: string;
  trade_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  postal_code: string | null;
  street: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export function mapCustomerRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    personType: row.person_type,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    taxId: row.tax_id,
    email: row.email,
    phone: row.phone,
    birthDate: row.birth_date,
    postalCode: row.postal_code,
    street: row.street,
    addressNumber: row.address_number,
    addressComplement: row.address_complement,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    notes: row.notes,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
