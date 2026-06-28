import { z } from 'zod';

export const syncRunReasonSchema = z.enum([
  'STARTUP',
  'PERIODIC',
  'MANUAL',
  'LOCAL_CHANGE',
  'REALTIME_EVENT',
  'RECONNECT'
]);

export const syncRunLogStatusSchema = z.enum([
  'RUNNING',
  'SUCCESS',
  'PARTIAL_SUCCESS',
  'FAILED',
  'CANCELLED'
]);

export const syncRunLogFiltersSchema = z.object({
  status: syncRunLogStatusSchema.optional(),
  reason: syncRunReasonSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional()
});
