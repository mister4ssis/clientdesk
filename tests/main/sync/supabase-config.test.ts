import { describe, expect, it, vi } from 'vitest';
import {
  getSupabaseConfig,
  getSupabaseConfigDiagnostic,
  loadSupabaseSyncConfig
} from '@main/integrations/supabase/supabase-config';

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
      MAIN_VITE_SUPABASE_URL: ' https://example.supabase.co ',
      MAIN_VITE_SUPABASE_PUBLISHABLE_KEY: ' publishable-key ',
      MAIN_VITE_SYNC_ENABLED: 'true',
      MAIN_VITE_SYNC_INTERVAL_MINUTES: '2',
      MAIN_VITE_SYNC_BATCH_SIZE: '25',
      MAIN_VITE_SYNC_REQUEST_TIMEOUT_MS: '5000'
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

  it('returns Supabase auth config even when sync is disabled', () => {
    const config = loadSupabaseSyncConfig({
      MAIN_VITE_SUPABASE_URL: 'https://example.supabase.co',
      MAIN_VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      MAIN_VITE_SYNC_ENABLED: 'false'
    });

    expect(config.enabled).toBe(false);
    expect(config.url).toBe('https://example.supabase.co');
    expect(config.publishableKey).toBe('publishable-key');
  });

  it('returns null when Supabase URL or publishable key is incomplete', () => {
    expect(
      getSupabaseConfig({
        MAIN_VITE_SUPABASE_URL: 'https://example.supabase.co'
      })
    ).toBeNull();
    expect(
      getSupabaseConfig({
        MAIN_VITE_SUPABASE_URL: 'not-a-url',
        MAIN_VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key'
      })
    ).toBeNull();
  });

  it('logs only sanitized Supabase configuration diagnostics', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const diagnostic = getSupabaseConfigDiagnostic({
      MAIN_VITE_SUPABASE_URL: 'https://example.supabase.co',
      MAIN_VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key'
    });

    loadSupabaseSyncConfig({
      MAIN_VITE_SUPABASE_URL: 'https://example.supabase.co',
      MAIN_VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key'
    });

    expect(diagnostic).toEqual({
      configured: true,
      hasUrl: true,
      hasPublishableKey: true
    });
    expect(infoSpy).toHaveBeenCalledWith(
      'Supabase main configuration.',
      diagnostic
    );
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('https://example.supabase.co');
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('publishable-key');

    infoSpy.mockRestore();
  });
});
