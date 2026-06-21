export type CustomerPersonType = 'FISICA' | 'JURIDICA';

export interface Customer {
  id: string;
  personType: CustomerPersonType;
  legalName: string;
  tradeName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  postalCode: string | null;
  street: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
