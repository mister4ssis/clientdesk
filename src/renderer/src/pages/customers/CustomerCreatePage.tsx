import { PageHeader } from '@renderer/components/layout/PageHeader';
import { createCustomer } from '@renderer/services/customer-client';
import { CustomerForm } from './components/CustomerForm';
import type { CreateCustomerInput } from '@shared/customers/customer.dto';

interface CustomerCreatePageProps {
  onCancel: () => void;
  onSaved: () => void;
}

export function CustomerCreatePage({ onCancel, onSaved }: CustomerCreatePageProps) {
  async function handleSubmit(input: CreateCustomerInput): Promise<void> {
    await createCustomer(input);
    onSaved();
  }

  return (
    <section className="customers-page" aria-labelledby="customer-create-title">
      <PageHeader
        titleId="customer-create-title"
        title="Novo cliente"
        subtitle="Cadastre os dados principais, contato e endereço do cliente."
      />

      <CustomerForm onSubmit={handleSubmit} onCancel={onCancel} />
    </section>
  );
}
