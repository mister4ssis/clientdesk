import type { AuthUser } from '@shared/auth/auth.types';
import { z } from 'zod';
import { SecureSessionStorage } from './secure-session-storage';

export interface LocalAuthProfile {
  userId: string;
  email: string | null;
  lastVerifiedAt: string;
}

const localAuthProfileSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().nullable(),
  lastVerifiedAt: z.string().datetime()
});

const profileStorageKey = 'clientdesk.local-auth-profile';

export class LocalAuthProfileRepository {
  constructor(private readonly storage: SecureSessionStorage) {}

  getProfile(): LocalAuthProfile | null {
    const rawProfile = this.storage.getItem(profileStorageKey);

    if (!rawProfile) {
      return null;
    }

    let profile: unknown;

    try {
      profile = JSON.parse(rawProfile) as unknown;
    } catch {
      return null;
    }

    const parsed = localAuthProfileSchema.safeParse(profile);

    return parsed.success ? parsed.data : null;
  }

  saveProfile(user: AuthUser, verifiedAt = new Date().toISOString()): LocalAuthProfile {
    const profile: LocalAuthProfile = {
      userId: user.id,
      email: user.email,
      lastVerifiedAt: verifiedAt
    };

    this.storage.setItem(profileStorageKey, JSON.stringify(profile));

    return profile;
  }

  clearProfile(): void {
    this.storage.removeItem(profileStorageKey);
  }
}
