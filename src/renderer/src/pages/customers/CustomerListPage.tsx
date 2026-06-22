import { useEffect, useMemo, useState } from 'react';
import type { Customer } from '@shared/customers/customer.types';
import { EmptyState } from '@renderer/components/feedback/EmptyState';
import { ErrorState } from '@renderer/components/feedback/ErrorState';
import { LoadingState } from '@renderer/components/feedback/LoadingState';
import { ConfirmDialog } from '@renderer/components/feedback/ConfirmDialog';
import { PageHeader } from '@renderer/components/layout/PageHeader';
import { CustomerSearchInput } from './components/CustomerSearchInput';
import { CustomerStatusFilter } from './components/CustomerStatusFilter';
import { CustomerTable } from './components/CustomerTable';
import { useCustomerFilters } from './hooks/useCustomerFilters';
import { useCustomers } from './hooks/useCustomers';

interface PendingStatusChange {
  customer: Customer;
  active: boolean;
}

interface CustomerListPageProps {
  initialFeedbackMessage?: string | null;
  onNewCustomer?: () => void;
  onEditCustomer?: (id: string) => void;
}

export function CustomerListPage({
  initialFeedbackMessage = null,
  onNewCustomer,
  onEditCustomer
}: CustomerListPageProps) {
  const { search, debouncedSearch, status, filters, setSearch, clearSearch, setStatus } =
    useCustomerFilters();
  const {
    customers,
    total,
    isLoading,
    isRefreshing,
    error,
    operatingCustomerId,
    reload,
    setCustomerActive
  } = useCustomers(filters);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(initialFeedbackMessage);

  useEffect(() => {
    setFeedbackMessage(initialFeedbackMessage);
  }, [initialFeedbackMessage]);

  const hasSearch = debouncedSearch.length > 0;
  const emptyState = useMemo(() => {
    if (hasSearch || status !== 'ACTIVE') {
      return {
        title: 'Nenhum cliente encontrado',
        message: 'Nenhum cliente corresponde à pesquisa ou ao filtro selecionado.',
        actionLabel: 'Limpar filtros'
      };
    }

    return {
      title: 'Nenhum cliente cadastrado',
      message: 'Cadastre o primeiro cliente para começar a usar o ClientDesk.',
      actionLabel: 'Cadastrar primeiro cliente'
    };
  }, [hasSearch, status]);

  async function confirmStatusChange(): Promise<void> {
    if (!pendingStatusChange) {
      return;
    }

    const { customer, active } = pendingStatusChange;
    await setCustomerActive(customer.id, active);
    setFeedbackMessage(active ? 'Cliente ativado com sucesso.' : 'Cliente inativado com sucesso.');
    setPendingStatusChange(null);
  }

  function handleEmptyAction(): void {
    if (hasSearch || status !== 'ACTIVE') {
      clearSearch();
      setStatus('ACTIVE');
      return;
    }

    onNewCustomer?.();
  }

  return (
    <section className="customers-page" aria-labelledby="customers-title">
      <PageHeader
        titleId="customers-title"
        title="Clientes"
        subtitle="Consulte, pesquise e gerencie a situação dos clientes cadastrados."
        actions={
          <button className="button button--primary" type="button" onClick={onNewCustomer}>
            Novo cliente
          </button>
        }
      />

      <div className="toolbar" aria-label="Filtros de clientes">
        <CustomerSearchInput value={search} onChange={setSearch} onClear={clearSearch} />
        <CustomerStatusFilter value={status} onChange={setStatus} />
      </div>

      {feedbackMessage ? (
        <div className="feedback-message" role="status">
          {feedbackMessage}
        </div>
      ) : null}

      {isRefreshing ? (
        <div className="refresh-indicator" role="status">
          Atualizando clientes...
        </div>
      ) : null}

      {isLoading ? <LoadingState message="Carregando clientes..." /> : null}

      {!isLoading && error ? (
        <ErrorState message={error.message} onRetry={() => void reload()} />
      ) : null}

      {!isLoading && !error && customers.length === 0 ? (
        <EmptyState
          title={emptyState.title}
          message={emptyState.message}
          actionLabel={emptyState.actionLabel}
          onAction={handleEmptyAction}
        />
      ) : null}

      {!isLoading && !error && customers.length > 0 ? (
        <>
          <div className="table-summary" aria-live="polite">
            {total} cliente{total === 1 ? '' : 's'} encontrado{total === 1 ? '' : 's'}.
          </div>
          <CustomerTable
            customers={customers}
            operatingCustomerId={operatingCustomerId}
            onRequestStatusChange={(customer, active) =>
              setPendingStatusChange({
                customer,
                active
              })
            }
            onEditCustomer={onEditCustomer}
          />
        </>
      ) : null}

      <ConfirmDialog
        isOpen={pendingStatusChange !== null}
        isBusy={operatingCustomerId === pendingStatusChange?.customer.id}
        title={pendingStatusChange?.active ? 'Ativar cliente' : 'Inativar cliente'}
        message={
          pendingStatusChange?.active
            ? `Deseja reativar ${pendingStatusChange.customer.legalName}?`
            : `Deseja inativar ${pendingStatusChange?.customer.legalName}? O cliente continuará armazenado e poderá ser reativado depois.`
        }
        confirmLabel={pendingStatusChange?.active ? 'Ativar cliente' : 'Inativar cliente'}
        onCancel={() => setPendingStatusChange(null)}
        onConfirm={() => void confirmStatusChange()}
      />
    </section>
  );
}
