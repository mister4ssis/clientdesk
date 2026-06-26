import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { SupabaseSyncConfig } from './supabase-config';
import { isSupabaseConfigured } from './supabase-config';

export type ClientDeskSupabaseClient = SupabaseClient<Database>;

export interface SupabaseAuthStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createClientDeskSupabaseClient(
  config: SupabaseSyncConfig,
  storage?: SupabaseAuthStorage
): ClientDeskSupabaseClient | null {
  if (!isSupabaseConfigured(config) || !config.url || !config.publishableKey) {
    return null;
  }

  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage
    }
  });
}
