import { net } from 'electron';
import type { ConnectivityStatus } from '@shared/sync/sync.types';
import type { ClientDeskSupabaseClient } from './supabase-client';
import type { SupabaseSyncConfig } from './supabase-config';
import { isSupabaseConfigured } from './supabase-config';

interface SupabaseConnectivityServiceOptions {
  isNetworkOnline?: () => boolean;
}

export class SupabaseConnectivityService {
  constructor(
    private readonly config: SupabaseSyncConfig,
    private readonly supabaseClient: ClientDeskSupabaseClient | null,
    private readonly options: SupabaseConnectivityServiceOptions = {}
  ) {}

  async check(): Promise<ConnectivityStatus> {
    if (!this.config.enabled) {
      return 'DISABLED';
    }

    if (!isSupabaseConfigured(this.config) || !this.supabaseClient) {
      return 'AUTH_ERROR';
    }

    const isNetworkOnline = this.options.isNetworkOnline ?? (() => net.isOnline());

    if (!isNetworkOnline()) {
      return 'OFFLINE';
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.config.requestTimeoutMs);

    try {
      if (this.config.pullEnabled) {
        const { data, error } = await this.supabaseClient.auth.getSession();

        if (error || !data.session) {
          return 'AUTH_ERROR';
        }
      }

      const { error, status } = await this.supabaseClient
        .from('customers')
        .select('id', { head: true, count: 'exact' })
        .limit(1)
        .abortSignal(abortController.signal);

      if (!error) {
        return 'ONLINE';
      }

      if (status === 401 || status === 403) {
        return 'AUTH_ERROR';
      }

      return 'REMOTE_ERROR';
    } catch {
      return 'OFFLINE';
    } finally {
      clearTimeout(timeout);
    }
  }
}
