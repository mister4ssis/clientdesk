export interface SupabaseSyncConfig {
  enabled: boolean;
  url: string | null;
  publishableKey: string | null;
  intervalMinutes: number;
  batchSize: number;
  requestTimeoutMs: number;
  hasForbiddenSecret: boolean;
}

const defaultIntervalMinutes = 5;
const defaultBatchSize = 50;
const defaultTimeoutMs = 10000;

export function loadSupabaseSyncConfig(env: NodeJS.ProcessEnv = process.env): SupabaseSyncConfig {
  const publishableKey = normalizeEnvValue(env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY);
  const hasForbiddenSecret = Boolean(
    normalizeEnvValue(env.SUPABASE_SERVICE_ROLE_KEY) ?? normalizeEnvValue(env.SUPABASE_SECRET_KEY)
  );

  if (hasForbiddenSecret) {
    console.warn('Supabase secret key configuration was detected and will not be used.');
  }

  return {
    enabled: parseBoolean(env.SYNC_ENABLED, false),
    url: normalizeEnvValue(env.SUPABASE_URL),
    publishableKey,
    intervalMinutes: parseBoundedInteger(
      env.SYNC_INTERVAL_MINUTES,
      defaultIntervalMinutes,
      1,
      60
    ),
    batchSize: parseBoundedInteger(env.SYNC_BATCH_SIZE, defaultBatchSize, 1, 200),
    requestTimeoutMs: parseBoundedInteger(env.SYNC_REQUEST_TIMEOUT_MS, defaultTimeoutMs, 1000, 30000),
    hasForbiddenSecret
  };
}

export function isSupabaseConfigured(config: SupabaseSyncConfig): boolean {
  return Boolean(config.enabled && config.url && config.publishableKey);
}

function normalizeEnvValue(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
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
