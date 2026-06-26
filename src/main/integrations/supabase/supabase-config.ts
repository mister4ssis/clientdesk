export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export interface SupabaseConfigDiagnostic {
  configured: boolean;
  hasUrl: boolean;
  hasPublishableKey: boolean;
}

export interface SupabaseSyncConfig {
  enabled: boolean;
  url: string | null;
  publishableKey: string | null;
  intervalMinutes: number;
  batchSize: number;
  pullEnabled: boolean;
  pullBatchSize: number;
  requestTimeoutMs: number;
  hasForbiddenSecret: boolean;
}

type SupabaseEnv = Partial<Record<MainSupabaseEnvKey, string>>;

type MainSupabaseEnvKey =
  | 'MAIN_VITE_SUPABASE_URL'
  | 'MAIN_VITE_SUPABASE_PUBLISHABLE_KEY'
  | 'MAIN_VITE_SYNC_ENABLED'
  | 'MAIN_VITE_SYNC_INTERVAL_MINUTES'
  | 'MAIN_VITE_SYNC_BATCH_SIZE'
  | 'MAIN_VITE_SYNC_REQUEST_TIMEOUT_MS'
  | 'MAIN_VITE_SYNC_PULL_ENABLED'
  | 'MAIN_VITE_SYNC_PULL_BATCH_SIZE';

const defaultIntervalMinutes = 5;
const defaultBatchSize = 50;
const defaultPullBatchSize = 100;
const defaultTimeoutMs = 10000;

export function loadSupabaseSyncConfig(env: SupabaseEnv = getMainEnv()): SupabaseSyncConfig {
  const supabaseConfig = getSupabaseConfig(env);
  logSupabaseConfigDiagnostic(getSupabaseConfigDiagnostic(env));

  return {
    enabled: parseBoolean(env.MAIN_VITE_SYNC_ENABLED, false),
    url: supabaseConfig?.url ?? null,
    publishableKey: supabaseConfig?.publishableKey ?? null,
    intervalMinutes: parseBoundedInteger(
      env.MAIN_VITE_SYNC_INTERVAL_MINUTES,
      defaultIntervalMinutes,
      1,
      60
    ),
    batchSize: parseBoundedInteger(env.MAIN_VITE_SYNC_BATCH_SIZE, defaultBatchSize, 1, 200),
    pullEnabled: parseBoolean(env.MAIN_VITE_SYNC_PULL_ENABLED, false),
    pullBatchSize: parseBoundedInteger(
      env.MAIN_VITE_SYNC_PULL_BATCH_SIZE,
      defaultPullBatchSize,
      1,
      500
    ),
    requestTimeoutMs: parseBoundedInteger(
      env.MAIN_VITE_SYNC_REQUEST_TIMEOUT_MS,
      defaultTimeoutMs,
      1000,
      30000
    ),
    hasForbiddenSecret: false
  };
}

export function getSupabaseConfig(env: SupabaseEnv = getMainEnv()): SupabaseConfig | null {
  const url = normalizeEnvValue(env.MAIN_VITE_SUPABASE_URL);
  const publishableKey = normalizeEnvValue(env.MAIN_VITE_SUPABASE_PUBLISHABLE_KEY);

  if (!url || !publishableKey || !isValidUrl(url) || !isValidPublishableKey(publishableKey)) {
    return null;
  }

  return {
    url,
    publishableKey
  };
}

export function getSupabaseConfigDiagnostic(
  env: SupabaseEnv = getMainEnv()
): SupabaseConfigDiagnostic {
  const url = normalizeEnvValue(env.MAIN_VITE_SUPABASE_URL);
  const publishableKey = normalizeEnvValue(env.MAIN_VITE_SUPABASE_PUBLISHABLE_KEY);

  return {
    configured: Boolean(
      url && publishableKey && isValidUrl(url) && isValidPublishableKey(publishableKey)
    ),
    hasUrl: Boolean(url),
    hasPublishableKey: Boolean(publishableKey)
  };
}

export function isSupabaseConfigured(config: SupabaseSyncConfig): boolean {
  return Boolean(config.url && config.publishableKey);
}

function getMainEnv(): SupabaseEnv {
  return import.meta.env;
}

function normalizeEnvValue(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidPublishableKey(value: string): boolean {
  return value.trim().length > 0;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.trim().toLowerCase() === 'true';
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function logSupabaseConfigDiagnostic(diagnostic: SupabaseConfigDiagnostic): void {
  console.info('Supabase main configuration.', diagnostic);
}
