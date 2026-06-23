import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { AppLayout } from '@renderer/layouts/AppLayout';
import { ErrorState } from '@renderer/components/feedback/ErrorState';
import { CustomerCreatePage } from '@renderer/pages/customers/CustomerCreatePage';
import { CustomerDetailsPage } from '@renderer/pages/customers/CustomerDetailsPage';
import { CustomerEditPage } from '@renderer/pages/customers/CustomerEditPage';
import { CustomerListPage } from '@renderer/pages/customers/CustomerListPage';
import { BackupSettingsPage } from '@renderer/pages/settings/BackupSettingsPage';

export function App(): ReactElement {
  const [locationKey, setLocationKey] = useState(0);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [editReturnPath, setEditReturnPath] = useState<string | null>(null);
  const route = useMemo(() => parseRoute(window.location.pathname), [locationKey]);

  useEffect(() => {
    function handlePopState(): void {
      setLocationKey((current) => current + 1);
    }

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function navigate(path: string, message?: string): void {
    window.history.pushState(null, '', path);
    setFlashMessage(message ?? null);
    setLocationKey((current) => current + 1);
  }

  function navigateToEdit(customerId: string, returnPath: string): void {
    setEditReturnPath(returnPath);
    navigate(`/customers/${customerId}/edit`);
  }

  return (
    <AppLayout activeItem={getActiveMenuItem(route)} onNavigate={navigate}>
      {route.name === 'customers' ? (
        <CustomerListPage
          initialFeedbackMessage={flashMessage}
          onNewCustomer={() => navigate('/customers/new')}
          onViewCustomer={(id) => navigate(`/customers/${id}`)}
          onEditCustomer={(id) => navigateToEdit(id, '/customers')}
        />
      ) : null}

      {route.name === 'customer-create' ? (
        <CustomerCreatePage
          onCancel={() => navigate('/customers')}
          onSaved={() => navigate('/customers', 'Cliente cadastrado com sucesso.')}
        />
      ) : null}

      {route.name === 'customer-edit' ? (
        <CustomerEditPage
          customerId={route.customerId}
          onCancel={() => navigate(editReturnPath ?? `/customers/${route.customerId}`)}
          onSaved={() =>
            navigate(editReturnPath ?? `/customers/${route.customerId}`, 'Cliente atualizado com sucesso.')
          }
        />
      ) : null}

      {route.name === 'customer-details' ? (
        <CustomerDetailsPage
          customerId={route.customerId}
          initialFeedbackMessage={flashMessage}
          onBack={() => navigate('/customers')}
          onEdit={(id) => navigateToEdit(id, `/customers/${id}`)}
        />
      ) : null}

      {route.name === 'backup-settings' ? (
        <BackupSettingsPage
          onRestoreCompleted={() => navigate('/customers', 'Backup restaurado com sucesso.')}
        />
      ) : null}

      {route.name === 'not-found' ? (
        <ErrorState message="Página não encontrada." onRetry={() => navigate('/customers')} />
      ) : null}
    </AppLayout>
  );
}

type AppRoute =
  | { name: 'customers' }
  | { name: 'customer-create' }
  | { name: 'customer-details'; customerId: string }
  | { name: 'customer-edit'; customerId: string }
  | { name: 'backup-settings' }
  | { name: 'not-found' };

function parseRoute(pathname: string): AppRoute {
  if (pathname === '/' || pathname === '/customers') {
    return { name: 'customers' };
  }

  if (pathname === '/customers/new') {
    return { name: 'customer-create' };
  }

  if (pathname === '/settings/backup') {
    return { name: 'backup-settings' };
  }

  const editMatch = /^\/customers\/([^/]+)\/edit$/.exec(pathname);

  if (editMatch) {
    return { name: 'customer-edit', customerId: decodeURIComponent(editMatch[1]) };
  }

  const detailsMatch = /^\/customers\/([^/]+)$/.exec(pathname);

  if (detailsMatch) {
    return { name: 'customer-details', customerId: decodeURIComponent(detailsMatch[1]) };
  }

  return { name: 'not-found' };
}

function getActiveMenuItem(route: AppRoute): 'customers' | 'settings' {
  return route.name === 'backup-settings' ? 'settings' : 'customers';
}
