import { z } from 'zod';

export const signInInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1)
});
