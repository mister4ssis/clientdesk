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
    const onSessionTokenChanged = vi.fn();
    const service = createService({
      supabaseClient,
      onAuthenticated,
      onSessionTokenChanged
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
    expect(onSessionTokenChanged).toHaveBeenCalledWith('session-token');
    expect(service.getState()).not.toHaveProperty('access_token');
  });

  it('returns a sanitized error for invalid credentials', async () => {
    const supabaseClient = createSupabaseClientMock({
      signInError: { code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 }
    });
    const service = createService({ supabaseClient });

    await expect(
      service.signInWithPassword({
        email: 'user@example.com',
        password: 'wrong'
      })
    ).rejects.toMatchObject({
      code: 'invalid_credentials'
    });
  });

  it('preserves email_not_confirmed from Supabase Auth', async () => {
    const supabaseClient = createSupabaseClientMock({
      signInError: { code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 }
    });
    const service = createService({ supabaseClient });

    await expect(
      service.signInWithPassword({
        email: 'user@example.com',
        password: 'secret'
      })
    ).rejects.toMatchObject({
      code: 'email_not_confirmed'
    });
  });

  it('maps thrown fetch failures to a public network auth code', async () => {
    const supabaseClient = createSupabaseClientMock({
      signInThrows: new Error('fetch failed')
    });
    const service = createService({ supabaseClient });

    await expect(
      service.signInWithPassword({
        email: 'user@example.com',
        password: 'secret'
      })
    ).rejects.toMatchObject({
      code: 'fetch_failed'
    });
  });

  it('logs auth failures without email, password or tokens', async () => {
    const authLogger = { log: vi.fn() };
    const supabaseClient = createSupabaseClientMock({
      signInError: {
        code: 'invalid_credentials',
        message: 'Invalid login credentials for user@example.com password=secret access_token=token',
        status: 400
      }
    });
    const service = createService({ supabaseClient, authLogger });

    await expect(
      service.signInWithPassword({
        email: 'user@example.com',
        password: 'secret'
      })
    ).rejects.toMatchObject({
      code: 'invalid_credentials'
    });

    const serializedLog = JSON.stringify(authLogger.log.mock.calls);
    expect(serializedLog).not.toContain('user@example.com');
    expect(serializedLog).not.toContain('secret');
    expect(serializedLog).not.toContain('token');
    expect(authLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'AUTH_SIGN_IN',
        code: 'invalid_credentials',
        status: 'failure'
      })
    );
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
  signInThrows?: Error;
  isNetworkOnline?: () => boolean;
  onAuthenticated?: ReturnType<typeof vi.fn>;
  onSessionTokenChanged?: ReturnType<typeof vi.fn>;
  authLogger?: { log: ReturnType<typeof vi.fn> };
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
    onAuthenticated: options.onAuthenticated,
    onSessionTokenChanged: options.onSessionTokenChanged,
    authLogger: options.authLogger
  });

  return {
    service,
    profileRepository
  };
}

function createSupabaseClientMock(
  options: { signInError?: { code?: string; message: string; status?: number }; signInThrows?: Error } = {}
): ClientDeskSupabaseClient {
  const auth = {
    signInWithPassword: vi.fn(async () => {
      if (options.signInThrows) {
        throw options.signInThrows;
      }

      return {
        data: options.signInError ? { user: null, session: null } : {},
        error: options.signInError ?? null
      };
    }),
    getUser: vi.fn(async () => ({
      data: {
        user: {
          id: userId,
          email: 'user@example.com'
        }
      },
      error: null
    })),
    getSession: vi.fn(async () => ({
      data: {
        session: {
          access_token: 'session-token'
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
