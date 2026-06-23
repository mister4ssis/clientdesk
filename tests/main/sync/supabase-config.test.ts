import { describe, expect, it, vi } from 'vitest';
import { loadSupabaseSyncConfig } from '@main/integrations/supabase/supabase-config';

describe('loadSupabaseSyncConfig', () => {
  it('defaults sync to disabled and safe limits', () => {
    expect(loadSupabaseSyncConfig({})).toMatchObject({
      enabled: false,
      url: null,
      publishableKey: null,
      intervalMinutes: 5,
      batchSize: 50,
      requestTimeoutMs: 10000
    });
  });

  it('accepts publishable key and bounded sync settings', () => {
    const config = loadSupabaseSyncConfig({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      SYNC_ENABLED: 'true',
      SYNC_INTERVAL_MINUTES: '2',
      SYNC_BATCH_SIZE: '25',
      SYNC_REQUEST_TIMEOUT_MS: '5000'
    });

    expect(config).toMatchObject({
      enabled: true,
      url: 'https://example.supabase.co',
      publishableKey: 'publishable-key',
      intervalMinutes: 2,
      batchSize: 25,
      requestTimeoutMs: 5000
    });
  });

  it('detects forbidden secret keys without exposing values', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const config = loadSupabaseSyncConfig({
      SUPABASE_SERVICE_ROLE_KEY: 'secret-value'
    });

    expect(config.hasForbiddenSecret).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      'Supabase secret key configuration was detected and will not be used.'
    );
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('secret-value');

    warnSpy.mockRestore();
  });
});
