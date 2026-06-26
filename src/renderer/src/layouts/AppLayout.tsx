import type { ReactNode } from 'react';
import type { AuthState } from '@shared/auth/auth.types';
import { OfflineSessionNotice } from '@renderer/components/auth/OfflineSessionNotice';
import { Sidebar } from '@renderer/components/layout/Sidebar';

interface AppLayoutProps {
  children: ReactNode;
  activeItem: 'customers' | 'settings';
  authState: AuthState;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

export function AppLayout({
  children,
  activeItem,
  authState,
  onNavigate,
  onSignOut
}: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar activeItem={activeItem} onNavigate={onNavigate} />
      <main className="app-content">
        <header className="app-topbar">
          <div>
            <strong>{authState.user?.email ?? 'Usuário autenticado'}</strong>
            <span>{authState.canSynchronize ? 'Sincronização ativa' : 'Sincronização pausada'}</span>
          </div>
          <button className="button button--secondary" type="button" onClick={onSignOut}>
            Sair
          </button>
        </header>
        <OfflineSessionNotice visible={authState.status === 'OFFLINE_AUTHENTICATED'} />
        {children}
      </main>
    </div>
  );
}
