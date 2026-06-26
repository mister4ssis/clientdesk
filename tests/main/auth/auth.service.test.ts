import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@main/modules/auth/auth.service';
import { LocalAuthProfileRepository } from '@main/modules/auth/local-auth-profile.repository';
import { SecureSessionStorage } from '@main/modules/auth/secure-session-storage';
import type { ClientDeskSupabaseClient } from '@main/integrations/supabase/supabase-client';

describe('AuthService', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('logs in with normalized email and verifies the remote user', async () => {
    const supabaseClient = createSupabaseClientMock();
    const onAuthenticated = vi.fn();
    const service = createService({
      supabaseClient,
      onAuthenticated
    });

    await expect(
      service.signInWithPassword({
        email: ' USER@Example.COM ',
        password: 'secret'
      })
    ).resolves.toMatchObject({
      status: 'AUTHENTICATED',
      user: {
        id: userId,
        email: 'user@example.com'
      },
      canSynchronize: true
    });

    expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret'
    });
    expect(onAuthenticated).toHaveBeenCalledWith(
      { id: userId, email: 'user@example.com' },
      'online'
    );
  });

  it('returns a sanitized error for invalid credentials', async () => {
    const supabaseClient = createSupabaseClientMock({
      signInError: { message: 'Invalid login credentials' }
    });
    const service = createService({ supabaseClient });

    await expect(
      service.signInWithPassword({
        email: 'user@example.com',
        password: 'wrong'
      })
    ).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS'
    });
  });

  it('rejects first access while offline', async () => {
    const service = createService({
      isNetworkOnline: () => false
    });

    await expect(
      service.signInWithPassword({
        email: 'user@example.com',
        password: 'secret'
      })
    ).rejects.toMatchObject({
      code: 'AUTH_OFFLINE_UNAVAILABLE'
    });
  });

  it('opens a known local profile in offline authenticated mode', async () => {
    const { service, profileRepository } = createServiceWithProfile({
      isNetworkOnline: () => false
    });
    profileRepository.saveProfile({
      id: userId,
      email: 'user@example.com'
    });

    await expect(service.initialize()).resolves.toMatchObject({
      status: 'OFFLINE_AUTHENTICATED',
      user: {
        id: userId,
        email: 'user@example.com'
      },
      canUseLocalData: true,
      canSynchronize: false
    });
  });

  it('clears session and profile on logout', async () => {
    const { service, profileRepository } = createServiceWithProfile();
    profileRepository.saveProfile({
      id: userId,
      email: 'user@example.com'
    });

    await service.signOut();

    expect(profileRepository.getProfile()).toBeNull();
    expect(service.getState()).toMatchObject({
      status: 'UNAUTHENTICATED',
      user: null
    });
  });
});

const userId = '00000000-0000-4000-8000-000000000001';

interface CreateServiceOptions {
  supabaseClient?: ClientDeskSupabaseClient;
  signInError?: { message: string };
  isNetworkOnline?: () => boolean;
  onAuthenticated?: ReturnType<typeof vi.fn>;
}

function createService(options: CreateServiceOptions = {}): AuthService {
  return createServiceWithProfile(options).service;
}

function createServiceWithProfile(options: CreateServiceOptions = {}) {
  const sessionStorage = new SecureSessionStorage({
    userDataPath: '/tmp/clientdesk-auth-test',
    safeStorage: createMemorySafeStorage(false)
  });
  const profileRepository = new LocalAuthProfileRepository(sessionStorage);
  const service = new AuthService({
    supabaseClient: options.supabaseClient ?? createSupabaseClientMock(options),
    sessionStorage,
    localProfileRepository: profileRepository,
    isNetworkOnline: options.isNetworkOnline ?? (() => true),
    onAuthenticated: options.onAuthenticated
  });

  return {
    service,
    profileRepository
  };
}

function createSupabaseClientMock(
  options: { signInError?: { message: string } } = {}
): ClientDeskSupabaseClient {
  const auth = {
    signInWithPassword: vi.fn(async () => ({
      data: options.signInError ? { user: null, session: null } : {},
      error: options.signInError ?? null
    })),
    getUser: vi.fn(async () => ({
      data: {
        user: {
          id: userId,
          email: 'user@example.com'
        }
      },
      error: null
    })),
    refreshSession: vi.fn(async () => ({
      data: {},
      error: null
    })),
    signOut: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn(() => ({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    }))
  };

  return {
    auth
  } as unknown as ClientDeskSupabaseClient;
}

function createMemorySafeStorage(encryptionAvailable: boolean) {
  return {
    isEncryptionAvailable: () => encryptionAvailable,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString('utf8')
  };
}
