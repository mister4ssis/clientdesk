import { useCallback, useEffect, useState } from 'react';
import type { AuthState } from '@shared/auth/auth.types';
import { ClientDeskAuthError, getAuthState, signIn, signOut } from '@renderer/services/auth-client';

const initialAuthState: AuthState = {
  status: 'INITIALIZING',
  user: null,
  canUseLocalData: false,
  canSynchronize: false
};

export interface UseAuthResult {
  authState: AuthState;
  isLoading: boolean;
  error: ClientDeskAuthError | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  reload(): Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ClientDeskAuthError | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setAuthState(await getAuthState());
    } catch (loadError) {
      setError(toAuthError(loadError));
      setAuthState({
        ...initialAuthState,
        status: 'ERROR'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function login(email: string, password: string): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      setAuthState(await signIn(email, password));
    } catch (loginError) {
      setError(toAuthError(loginError));
    } finally {
      setIsLoading(false);
    }
  }

  async function logout(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      await signOut();
      setAuthState({
        ...initialAuthState,
        status: 'UNAUTHENTICATED'
      });
    } catch (logoutError) {
      setError(toAuthError(logoutError));
    } finally {
      setIsLoading(false);
    }
  }

  return {
    authState,
    isLoading,
    error,
    login,
    logout,
    reload
  };
}

function toAuthError(error: unknown): ClientDeskAuthError {
  if (error instanceof ClientDeskAuthError) {
    return error;
  }

  return new ClientDeskAuthError(
    'INTERNAL_ERROR',
    'Ocorreu um erro inesperado ao acessar a autenticação.'
  );
}
