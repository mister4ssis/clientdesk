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
    Functions: {
      sync_upsert_customer: {
        Args: {
          customer_data: RemoteCustomerRpcPayload;
          expected_version: number | null;
        };
        Returns: RemoteCustomerSyncResult[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type RemoteCustomerRow = {
  [key: string]: unknown;
  id: string;
  user_id: string;
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
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RemoteCustomerInsert = RemoteCustomerRow;

export type RemoteCustomerRpcPayload = Omit<RemoteCustomerRow, 'user_id' | 'version'>;

export interface RemoteCustomerSyncResult {
  result: 'UPSERTED' | 'CONFLICT';
  remote_version: number;
  remote_updated_at: string;
  remote_customer: RemoteCustomerRow;
}
