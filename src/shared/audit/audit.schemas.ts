import { z } from 'zod';

export const customerAuditOperationSchema = z.enum([
  'CREATED',
  'UPDATED',
  'ACTIVATED',
  'DEACTIVATED',
  'REMOTE_CREATED',
  'REMOTE_UPDATED',
  'REMOTE_DELETED',
  'CONFLICT_KEEP_LOCAL',
  'CONFLICT_USE_REMOTE'
]);

export const customerAuditSourceSchema = z.enum([
  'LOCAL_USER',
  'REMOTE_SYNC',
  'CONFLICT_RESOLUTION',
  'SYSTEM'
]);

export const customerAuditFiltersSchema = z.object({
  operation: customerAuditOperationSchema.optional(),
  source: customerAuditSourceSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional()
});

export const customerAuditListInputSchema = z.object({
  customerId: z.string().uuid(),
  filters: customerAuditFiltersSchema.optional()
});
