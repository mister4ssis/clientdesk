import type { ReactNode } from 'react';
import { Sidebar } from '@renderer/components/layout/Sidebar';

interface AppLayoutProps {
  children: ReactNode;
  activeItem: 'customers' | 'settings';
  onNavigate: (path: string) => void;
}

export function AppLayout({ children, activeItem, onNavigate }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar activeItem={activeItem} onNavigate={onNavigate} />
      <main className="app-content">{children}</main>
    </div>
  );
}
