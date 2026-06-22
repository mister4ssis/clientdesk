import { ErrorState } from '@renderer/components/feedback/ErrorState';
import { LoadingState } from '@renderer/components/feedback/LoadingState';
import { PageHeader } from '@renderer/components/layout/PageHeader';
import { updateCustomer } from '@renderer/services/customer-client';
import type { CreateCustomerInput } from '@shared/customers/customer.dto';
import { CustomerForm } from './components/CustomerForm';
import { useCustomerById } from './hooks/useCustomerById';

interface CustomerEditPageProps {
  customerId: string;
  onCancel: () => void;
  onSaved: () => void;
}

export function CustomerEditPage({ customerId, onCancel, onSaved }: CustomerEditPageProps) {
  const { customer, isLoading, error, reload } = useCustomerById(customerId);

  async function handleSubmit(input: CreateCustomerInput): Promise<void> {
    await updateCustomer(customerId, input);
    onSaved();
  }

  return (
    <section className="customers-page" aria-labelledby="customer-edit-title">
      <PageHeader
        titleId="customer-edit-title"
        title="Editar cliente"
        subtitle="Atualize os dados cadastrais do cliente selecionado."
      />

      {isLoading ? <LoadingState message="Carregando cliente..." /> : null}

      {!isLoading && error ? (
        <ErrorState message={getLoadErrorMessage(error.code)} onRetry={() => void reload()} />
      ) : null}

      {!isLoading && !error && customer ? (
        <CustomerForm customer={customer} onSubmit={handleSubmit} onCancel={onCancel} />
      ) : null}
    </section>
  );
}

function getLoadErrorMessage(code: string): string {
  switch (code) {
    case 'CUSTOMER_NOT_FOUND':
      return 'Cliente não encontrado.';
    case 'VALIDATION_ERROR':
      return 'Cliente inválido.';
    case 'DATABASE_ERROR':
      return 'Não foi possível carregar os dados do cliente.';
    default:
      return 'Ocorreu um erro inesperado ao carregar o cliente.';
  }
}
