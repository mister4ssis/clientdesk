import type { UpdateChannel } from '@shared/update/update.types';

export interface UpdateConfig {
  enabled: boolean;
  channel: UpdateChannel;
  checkDelaySeconds: number;
}

type UpdateEnv = Partial<Record<UpdateEnvKey, string>>;

type UpdateEnvKey =
  | 'MAIN_VITE_UPDATE_ENABLED'
  | 'MAIN_VITE_UPDATE_CHANNEL'
  | 'MAIN_VITE_UPDATE_CHECK_DELAY_SECONDS';

const defaultCheckDelaySeconds = 30;

export function loadUpdateConfig(env: UpdateEnv = import.meta.env): UpdateConfig {
  return {
    enabled: parseBoolean(env.MAIN_VITE_UPDATE_ENABLED, false),
    channel: parseChannel(env.MAIN_VITE_UPDATE_CHANNEL),
    checkDelaySeconds: parseBoundedInteger(
      env.MAIN_VITE_UPDATE_CHECK_DELAY_SECONDS,
      defaultCheckDelaySeconds,
      0,
      3600
    )
  };
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.trim().toLowerCase() === 'true';
}

function parseChannel(value: string | undefined): UpdateChannel {
  const normalized = value?.trim().toLowerCase();

  return normalized === 'beta' ? 'beta' : 'stable';
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
