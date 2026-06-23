import { z } from 'zod';

export const connectivityStatusSchema = z.enum([
  'ONLINE',
  'OFFLINE',
  'AUTH_ERROR',
  'REMOTE_ERROR',
  'DISABLED'
]);

export const syncStatusSchema = z.object({
  enabled: z.boolean(),
  pullEnabled: z.boolean(),
  connectivity: connectivityStatusSchema,
  running: z.boolean(),
  direction: z.enum(['IDLE', 'PUSHING', 'PULLING', 'RESOLVING_CONFLICT']),
  pendingCount: z.number().int().nonnegative(),
  conflictCount: z.number().int().nonnegative(),
  lastStartedAt: z.string().datetime().nullable(),
  lastCompletedAt: z.string().datetime().nullable(),
  lastPushAt: z.string().datetime().nullable(),
  lastPullAt: z.string().datetime().nullable(),
  lastSuccessfulAt: z.string().datetime().nullable(),
  lastErrorCode: z.string().nullable()
});
