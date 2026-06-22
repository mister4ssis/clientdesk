import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { AppLayout } from '@renderer/layouts/AppLayout';
import { ErrorState } from '@renderer/components/feedback/ErrorState';
import { CustomerCreatePage } from '@renderer/pages/customers/CustomerCreatePage';
import { CustomerEditPage } from '@renderer/pages/customers/CustomerEditPage';
import { CustomerListPage } from '@renderer/pages/customers/CustomerListPage';

export function App(): ReactElement {
  const [locationKey, setLocationKey] = useState(0);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
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

  return (
    <AppLayout>
      {route.name === 'customers' ? (
        <CustomerListPage
          initialFeedbackMessage={flashMessage}
          onNewCustomer={() => navigate('/customers/new')}
          onEditCustomer={(id) => navigate(`/customers/${id}/edit`)}
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
          onCancel={() => navigate('/customers')}
          onSaved={() => navigate('/customers', 'Cliente atualizado com sucesso.')}
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
  | { name: 'customer-edit'; customerId: string }
  | { name: 'not-found' };

function parseRoute(pathname: string): AppRoute {
  if (pathname === '/' || pathname === '/customers') {
    return { name: 'customers' };
  }

  if (pathname === '/customers/new') {
    return { name: 'customer-create' };
  }

  const editMatch = /^\/customers\/([^/]+)\/edit$/.exec(pathname);

  if (editMatch) {
    return { name: 'customer-edit', customerId: decodeURIComponent(editMatch[1]) };
  }

  return { name: 'not-found' };
}
