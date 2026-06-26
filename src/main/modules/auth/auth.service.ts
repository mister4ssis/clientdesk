import { net } from 'electron';
import type { AuthChangeEvent } from '@supabase/supabase-js';
import type { AuthState, AuthUser, SignInInput } from '@shared/auth/auth.types';
import { signInInputSchema } from '@shared/auth/auth.schemas';
import { ApplicationError } from '../../errors/application-error';
import { ErrorCode } from '../../errors/error-codes';
import type { ClientDeskSupabaseClient } from '../../integrations/supabase/supabase-client';
import { mapSupabaseUser } from './auth-session.mapper';
import type { LocalAuthProfileRepository } from './local-auth-profile.repository';
import type { SecureSessionStorage } from './secure-session-storage';

interface AuthServiceDependencies {
  supabaseClient: ClientDeskSupabaseClient | null;
  sessionStorage: SecureSessionStorage;
  localProfileRepository: LocalAuthProfileRepository;
  isNetworkOnline?: () => boolean;
  onAuthenticated?: (user: AuthUser, mode: 'online' | 'offline') => void | Promise<void>;
  onSignedOut?: () => void | Promise<void>;
}

export class AuthService {
  private state: AuthState = createAuthState('INITIALIZING', null);
  private unsubscribeAuthListener: (() => void) | null = null;
  private readonly supabaseClient: ClientDeskSupabaseClient | null;
  private readonly sessionStorage: SecureSessionStorage;
  private readonly localProfileRepository: LocalAuthProfileRepository;
  private readonly isNetworkOnline: () => boolean;
  private readonly onAuthenticated?: AuthServiceDependencies['onAuthenticated'];
  private readonly onSignedOut?: AuthServiceDependencies['onSignedOut'];

  constructor(dependencies: AuthServiceDependencies) {
    this.supabaseClient = dependencies.supabaseClient;
    this.sessionStorage = dependencies.sessionStorage;
    this.localProfileRepository = dependencies.localProfileRepository;
    this.isNetworkOnline = dependencies.isNetworkOnline ?? (() => net.isOnline());
    this.onAuthenticated = dependencies.onAuthenticated;
    this.onSignedOut = dependencies.onSignedOut;
  }

  async initialize(): Promise<AuthState> {
    this.subscribeToAuthChanges();

    if (!this.supabaseClient) {
      return this.initializeOfflineProfile();
    }

    if (!this.isNetworkOnline()) {
      return this.initializeOfflineProfile();
    }

    try {
      const { data, error } = await this.supabaseClient.auth.getUser();

      if (!error && data.user) {
        const user = mapSupabaseUser(data.user);
        this.localProfileRepository.saveProfile(user);
        await this.applyAuthenticatedUser(user, 'online');

        return this.state;
      }
    } catch {
      return this.initializeOfflineProfile();
    }

    return this.initializeOfflineProfile();
  }

  async signInWithPassword(input: SignInInput): Promise<AuthState> {
    const credentials = signInInputSchema.parse(input);

    if (!this.supabaseClient) {
      throw new ApplicationError(
        ErrorCode.AuthConfigurationError,
        'Supabase Auth não configurado.'
      );
    }

    if (!this.isNetworkOnline()) {
      throw new ApplicationError(
        ErrorCode.AuthOfflineUnavailable,
        'Primeiro acesso offline indisponível.'
      );
    }

    const { error } = await this.supabaseClient.auth.signInWithPassword(credentials);

    if (error) {
      throw new ApplicationError(ErrorCode.AuthInvalidCredentials, 'Credenciais inválidas.');
    }

    const user = await this.getVerifiedUser();
    this.localProfileRepository.saveProfile(user);
    await this.applyAuthenticatedUser(user, 'online');

    return this.state;
  }

  async signOut(): Promise<void> {
    const previousUser = this.state.user;

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.auth.signOut();
      } catch {
        // Local logout must still clear the session and stop sync.
      }
    }

    this.sessionStorage.clear();
    this.localProfileRepository.clearProfile();
    this.state = createAuthState('UNAUTHENTICATED', null);

    if (previousUser) {
      await this.onSignedOut?.();
    }
  }

  getState(): AuthState {
    return this.state;
  }

  async refreshSession(): Promise<AuthState> {
    if (!this.supabaseClient) {
      return this.initializeOfflineProfile();
    }

    const { error } = await this.supabaseClient.auth.refreshSession();

    if (error) {
      this.state = createAuthState('SESSION_EXPIRED', this.state.user);
      return this.state;
    }

    const user = await this.getVerifiedUser();
    this.localProfileRepository.saveProfile(user);
    await this.applyAuthenticatedUser(user, 'online');

    return this.state;
  }

  async getVerifiedUser(): Promise<AuthUser> {
    if (!this.supabaseClient) {
      throw new ApplicationError(
        ErrorCode.AuthConfigurationError,
        'Supabase Auth não configurado.'
      );
    }

    const { data, error } = await this.supabaseClient.auth.getUser();

    if (error || !data.user) {
      throw new ApplicationError(ErrorCode.AuthSessionExpired, 'Sessão expirada.');
    }

    return mapSupabaseUser(data.user);
  }

  subscribeToAuthChanges(): void {
    if (!this.supabaseClient || this.unsubscribeAuthListener) {
      return;
    }

    const { data } = this.supabaseClient.auth.onAuthStateChange((event) => {
      setTimeout(() => {
        void this.handleAuthChange(event);
      }, 0);
    });

    this.unsubscribeAuthListener = () => data.subscription.unsubscribe();
  }

  dispose(): void {
    this.unsubscribeAuthListener?.();
    this.unsubscribeAuthListener = null;
  }

  private async handleAuthChange(event: AuthChangeEvent): Promise<void> {
    if (event === 'SIGNED_OUT') {
      this.state = createAuthState('UNAUTHENTICATED', null);
      await this.onSignedOut?.();
      return;
    }

    if (
      event === 'INITIAL_SESSION' ||
      event === 'SIGNED_IN' ||
      event === 'TOKEN_REFRESHED' ||
      event === 'USER_UPDATED'
    ) {
      try {
        const user = await this.getVerifiedUser();
        this.localProfileRepository.saveProfile(user);
        await this.applyAuthenticatedUser(user, 'online');
      } catch {
        this.state = createAuthState('SESSION_EXPIRED', this.state.user);
      }
    }
  }

  private async initializeOfflineProfile(): Promise<AuthState> {
    const profile = this.localProfileRepository.getProfile();

    if (profile && !this.isNetworkOnline()) {
      const user: AuthUser = {
        id: profile.userId,
        email: profile.email
      };
      await this.applyAuthenticatedUser(user, 'offline');

      return this.state;
    }

    this.state = createAuthState('UNAUTHENTICATED', null);

    return this.state;
  }

  private async applyAuthenticatedUser(
    user: AuthUser,
    mode: 'online' | 'offline'
  ): Promise<void> {
    this.state = createAuthState(
      mode === 'online' ? 'AUTHENTICATED' : 'OFFLINE_AUTHENTICATED',
      user
    );
    await this.onAuthenticated?.(user, mode);
  }
}

function createAuthState(status: AuthState['status'], user: AuthUser | null): AuthState {
  return {
    status,
    user,
    canUseLocalData: status === 'AUTHENTICATED' || status === 'OFFLINE_AUTHENTICATED',
    canSynchronize: status === 'AUTHENTICATED'
  };
}
