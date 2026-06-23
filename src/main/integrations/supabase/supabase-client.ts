import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { SupabaseSyncConfig } from './supabase-config';
import { isSupabaseConfigured } from './supabase-config';

export type ClientDeskSupabaseClient = SupabaseClient<Database>;

export function createClientDeskSupabaseClient(
  config: SupabaseSyncConfig
): ClientDeskSupabaseClient | null {
  if (!isSupabaseConfigured(config) || !config.url || !config.publishableKey) {
    return null;
  }

  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}
