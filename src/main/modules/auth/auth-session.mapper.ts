import type { User } from '@supabase/supabase-js';
import type { AuthUser } from '@shared/auth/auth.types';

export function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null
  };
}
