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
  connectivity: connectivityStatusSchema,
  running: z.boolean(),
  pendingCount: z.number().int().nonnegative(),
  lastStartedAt: z.string().datetime().nullable(),
  lastCompletedAt: z.string().datetime().nullable(),
  lastSuccessfulAt: z.string().datetime().nullable(),
  lastErrorCode: z.string().nullable()
});
