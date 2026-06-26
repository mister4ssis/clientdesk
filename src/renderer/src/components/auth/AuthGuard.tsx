import type { ReactNode } from 'react';
import type { AuthState } from '@shared/auth/auth.types';
import { LoadingState } from '@renderer/components/feedback/LoadingState';
import { useAuth } from '@renderer/hooks/use-auth';
import { LoginPage } from '@renderer/pages/auth/LoginPage';

interface AuthGuardProps {
  children(auth: { authState: AuthState; logout(): Promise<void> }): ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { authState, isLoading, error, login, logout } = useAuth();

  if (isLoading && authState.status === 'INITIALIZING') {
    return <LoadingState message="Inicializando autenticação..." />;
  }

  if (
    authState.status === 'UNAUTHENTICATED' ||
    authState.status === 'SESSION_EXPIRED' ||
    authState.status === 'ERROR'
  ) {
    return (
      <LoginPage
        authState={authState}
        error={error}
        isLoading={isLoading}
        onLogin={login}
      />
    );
  }

  return <>{children({ authState, logout })}</>;
}
