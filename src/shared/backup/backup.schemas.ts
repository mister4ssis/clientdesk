import { z } from 'zod';

export const backupResultSchema = z.object({
  success: z.boolean(),
  fileName: z.string().optional(),
  createdAt: z.string().optional()
});

export const restoreResultSchema = z.object({
  success: z.boolean(),
  restoredAt: z.string().optional()
});

export const backupValidationResultSchema = z.object({
  valid: z.boolean(),
  version: z.number().int().nonnegative().optional(),
  createdAt: z.string().optional(),
  reason: z.string().optional()
});
