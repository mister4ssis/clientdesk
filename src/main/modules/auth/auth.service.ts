import { net } from 'electron';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { AuthState, AuthUser, SignInInput } from '@shared/auth/auth.types';
import { signInInputSchema } from '@shared/auth/auth.schemas';
import { ApplicationError } from '../../errors/application-error';
import { ErrorCode } from '../../errors/error-codes';
import type { ClientDeskSupabaseClient } from '../../integrations/supabase/supabase-client';
import type { AuthEventLogger } from '../../logging/auth-event-logger';
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
  onSessionTokenChanged?: (accessToken: string | null) => void | Promise<void>;
  authLogger?: Pick<AuthEventLogger, 'log'>;
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
  private readonly onSessionTokenChanged?: AuthServiceDependencies['onSessionTokenChanged'];
  private readonly authLogger?: Pick<AuthEventLogger, 'log'>;

  constructor(dependencies: AuthServiceDependencies) {
    this.supabaseClient = dependencies.supabaseClient;
    this.sessionStorage = dependencies.sessionStorage;
    this.localProfileRepository = dependencies.localProfileRepository;
    this.isNetworkOnline = dependencies.isNetworkOnline ?? (() => net.isOnline());
    this.onAuthenticated = dependencies.onAuthenticated;
    this.onSignedOut = dependencies.onSignedOut;
    this.onSessionTokenChanged = dependencies.onSessionTokenChanged;
    this.authLogger = dependencies.authLogger;
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
        await this.emitCurrentSessionToken();
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
      const error = new ApplicationError(
        ErrorCode.AuthConfigurationError,
        'Supabase Auth não configurado.'
      );
      this.logSignIn('failure', error.code, error.message);
      throw error;
    }

    if (!this.isNetworkOnline()) {
      const error = new ApplicationError(
        ErrorCode.AuthOfflineUnavailable,
        'Primeiro acesso offline indisponível.'
      );
      this.logSignIn('failure', error.code, error.message);
      throw error;
    }

    let signInResult: Awaited<ReturnType<ClientDeskSupabaseClient['auth']['signInWithPassword']>>;

    try {
      signInResult = await this.supabaseClient.auth.signInWithPassword(credentials);
    } catch (signInError) {
      const mappedError = mapThrownAuthError(signInError);
      this.logSignIn('failure', mappedError.code, mappedError.message);
      throw mappedError;
    }

    const { error } = signInResult;

    if (error) {
      const mappedError = mapSupabaseAuthError(error);
      this.logSignIn('failure', mappedError.code, mappedError.message);
      throw mappedError;
    }

    const user = await this.getVerifiedUser();
    this.localProfileRepository.saveProfile(user);
    await this.emitCurrentSessionToken();
    await this.applyAuthenticatedUser(user, 'online');
    this.logSignIn('success', 'AUTHENTICATED', 'Autenticação concluída.');

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
    await this.emitSessionToken(null);

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
      await this.emitSessionToken(null);
      return this.state;
    }

    const user = await this.getVerifiedUser();
    this.localProfileRepository.saveProfile(user);
    await this.emitCurrentSessionToken();
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

    const { data } = this.supabaseClient.auth.onAuthStateChange((event, session) => {
      setTimeout(() => {
        void this.handleAuthChange(event, session);
      }, 0);
    });

    this.unsubscribeAuthListener = () => data.subscription.unsubscribe();
  }

  dispose(): void {
    this.unsubscribeAuthListener?.();
    this.unsubscribeAuthListener = null;
  }

  private async handleAuthChange(event: AuthChangeEvent, session: Session | null): Promise<void> {
    if (event === 'SIGNED_OUT') {
      this.state = createAuthState('UNAUTHENTICATED', null);
      await this.emitSessionToken(null);
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
        await this.emitSessionToken(session?.access_token ?? null);
        const user = await this.getVerifiedUser();
        this.localProfileRepository.saveProfile(user);
        await this.applyAuthenticatedUser(user, 'online');
      } catch {
        this.state = createAuthState('SESSION_EXPIRED', this.state.user);
        await this.emitSessionToken(null);
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
      await this.emitSessionToken(null);
      await this.applyAuthenticatedUser(user, 'offline');

      return this.state;
    }

    this.state = createAuthState('UNAUTHENTICATED', null);
    await this.emitSessionToken(null);

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

  private async emitCurrentSessionToken(): Promise<void> {
    if (!this.supabaseClient) {
      await this.emitSessionToken(null);
      return;
    }

    try {
      const { data } = await this.supabaseClient.auth.getSession();
      await this.emitSessionToken(data.session?.access_token ?? null);
    } catch {
      await this.emitSessionToken(null);
    }
  }

  private async emitSessionToken(accessToken: string | null): Promise<void> {
    await this.onSessionTokenChanged?.(accessToken);
  }

  private logSignIn(status: 'success' | 'failure', code: string, message: string): void {
    this.authLogger?.log({
      event: 'AUTH_SIGN_IN',
      code,
      status,
      message
    });
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

interface SupabaseAuthErrorLike {
  code?: string;
  status?: number;
  message?: string;
}

function mapSupabaseAuthError(error: SupabaseAuthErrorLike): ApplicationError {
  const code = normalizeAuthErrorCode(error.code);
  const message = error.message?.toLowerCase() ?? '';

  if (code === ErrorCode.AuthEmailNotConfirmed || message.includes('email not confirmed')) {
    return new ApplicationError(ErrorCode.AuthEmailNotConfirmed, 'E-mail não confirmado.', {
      cause: { code, status: error.status }
    });
  }

  if (
    code === ErrorCode.AuthSupabaseInvalidCredentials ||
    message.includes('invalid login credentials') ||
    error.status === 400
  ) {
    return new ApplicationError(ErrorCode.AuthSupabaseInvalidCredentials, 'Credenciais inválidas.', {
      cause: { code, status: error.status }
    });
  }

  if (code === ErrorCode.AuthFetchFailed || message.includes('fetch failed')) {
    return new ApplicationError(ErrorCode.AuthFetchFailed, 'Falha de conexão.', {
      cause: { code, status: error.status }
    });
  }

  if (code === ErrorCode.AuthNetworkError || message.includes('network')) {
    return new ApplicationError(ErrorCode.AuthNetworkError, 'Falha de rede.', {
      cause: { code, status: error.status }
    });
  }

  return new ApplicationError(ErrorCode.AuthInvalidCredentials, 'Falha na autenticação.', {
    cause: { code, status: error.status }
  });
}

function mapThrownAuthError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('fetch failed')) {
      return new ApplicationError(ErrorCode.AuthFetchFailed, 'Falha de conexão.', { cause: error });
    }

    if (message.includes('network')) {
      return new ApplicationError(ErrorCode.AuthNetworkError, 'Falha de rede.', { cause: error });
    }
  }

  return new ApplicationError(ErrorCode.AuthNetworkError, 'Falha de rede.', { cause: error });
}

function normalizeAuthErrorCode(code: string | undefined): string | null {
  return code?.trim().toLowerCase() || null;
}
