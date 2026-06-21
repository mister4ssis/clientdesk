import type { ReactElement } from 'react';
import { AppLayout } from '@renderer/layouts/AppLayout';
import { CustomerListPage } from '@renderer/pages/customers/CustomerListPage';

export function App(): ReactElement {
  return (
    <AppLayout>
      <CustomerListPage />
    </AppLayout>
  );
}
