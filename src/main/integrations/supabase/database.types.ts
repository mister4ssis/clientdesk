export interface Database {
  public: {
    Tables: {
      customers: {
        Row: RemoteCustomerRow;
        Insert: RemoteCustomerInsert;
        Update: Partial<RemoteCustomerInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type RemoteCustomerRow = {
  [key: string]: unknown;
  id: string;
  person_type: 'FISICA' | 'JURIDICA';
  legal_name: string;
  trade_name: string | null;
  representative: string | null;
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
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type RemoteCustomerInsert = RemoteCustomerRow;
