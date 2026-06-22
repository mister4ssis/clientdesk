import { useState } from 'react';
import { EmptyState } from '@renderer/components/feedback/EmptyState';
import { ErrorState } from '@renderer/components/feedback/ErrorState';
import { LoadingState } from '@renderer/components/feedback/LoadingState';
import type { Customer } from '@shared/customers/customer.types';
import {
  formatDate,
  formatDateTime,
  formatOptionalValue,
  formatPersonType,
  formatPhone,
  formatPostalCode,
  formatTaxId
} from './customer-display-formatters';
import { CustomerDetailsField } from './components/CustomerDetailsField';
import { CustomerDetailsHeader } from './components/CustomerDetailsHeader';
import { CustomerDetailsSection } from './components/CustomerDetailsSection';
import { CustomerStatusBadge } from './components/CustomerStatusBadge';
import { CustomerStatusDialog } from './components/CustomerStatusDialog';
import { useCustomerById } from './hooks/useCustomerById';

interface CustomerDetailsPageProps {
  customerId: string;
  initialFeedbackMessage?: string | null;
  onBack: () => void;
  onEdit: (id: string) => void;
}

export function CustomerDetailsPage({
  customerId,
  initialFeedbackMessage = null,
  onBack,
  onEdit
}: CustomerDetailsPageProps) {
  const {
    customer,
    isLoading,
    isUpdatingStatus,
    error,
    statusError,
    reload,
    setCustomerActive
  } = useCustomerById(customerId);
  const [pendingActive, setPendingActive] = useState<boolean | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(initialFeedbackMessage);

  async function confirmStatusChange(): Promise<void> {
    if (pendingActive === null) {
      return;
    }

    const updatedCustomer = await setCustomerActive(pendingActive);

    if (!updatedCustomer) {
      return;
    }

    setFeedbackMessage(
      pendingActive ? 'Cliente ativado com sucesso.' : 'Cliente inativado com sucesso.'
    );
    setPendingActive(null);
  }

  return (
    <section className="customers-page" aria-labelledby="customer-details-title">
      {isLoading ? <LoadingState message="Carregando cliente..." /> : null}

      {!isLoading && error ? (
        error.code === 'CUSTOMER_NOT_FOUND' ? (
          <EmptyState
            title="Cliente não encontrado"
            message="O registro pode ter sido removido ou não está disponível."
            actionLabel="Voltar para clientes"
            onAction={onBack}
          />
        ) : (
          <ErrorState message={getLoadErrorMessage(error.code)} onRetry={() => void reload()} />
        )
      ) : null}

      {!isLoading && !error && customer ? (
        <>
          <CustomerDetailsHeader
            customer={customer}
            isUpdatingStatus={isUpdatingStatus}
            onBack={onBack}
            onEdit={() => onEdit(customer.id)}
            onRequestStatusChange={setPendingActive}
          />

          {feedbackMessage ? (
            <div className="feedback-message" role="status">
              {feedbackMessage}
            </div>
          ) : null}

          {statusError ? (
            <div className="form-alert" role="alert">
              {getStatusErrorMessage(statusError.code)}
            </div>
          ) : null}

          <CustomerDetailsContent customer={customer} />

          <CustomerStatusDialog
            customer={customer}
            nextActive={pendingActive}
            isBusy={isUpdatingStatus}
            onCancel={() => setPendingActive(null)}
            onConfirm={() => void confirmStatusChange()}
          />
        </>
      ) : null}
    </section>
  );
}

function CustomerDetailsContent({ customer }: { customer: Customer }) {
  const isIndividual = customer.personType === 'FISICA';

  return (
    <div className="details-content">
      <CustomerDetailsSection title="Dados principais">
        <CustomerDetailsField label="Tipo de pessoa" value={formatPersonType(customer.personType)} />
        <CustomerDetailsField
          label={isIndividual ? 'Nome' : 'Razão social'}
          value={formatOptionalValue(customer.legalName)}
        />
        {customer.tradeName || !isIndividual ? (
          <CustomerDetailsField label="Nome fantasia" value={formatOptionalValue(customer.tradeName)} />
        ) : null}
        <CustomerDetailsField label={isIndividual ? 'CPF' : 'CNPJ'} value={formatTaxId(customer.taxId)} />
        {customer.birthDate || isIndividual ? (
          <CustomerDetailsField
            label="Data de nascimento"
            value={formatDate(customer.birthDate)}
          />
        ) : null}
        <CustomerDetailsField label="Situação" value={<CustomerStatusBadge active={customer.active} />} />
      </CustomerDetailsSection>

      <CustomerDetailsSection title="Contato">
        <CustomerDetailsField label="E-mail" value={formatOptionalValue(customer.email)} />
        <CustomerDetailsField label="Telefone" value={formatPhone(customer.phone)} />
      </CustomerDetailsSection>

      <CustomerDetailsSection title="Endereço">
        <CustomerDetailsField label="CEP" value={formatPostalCode(customer.postalCode)} />
        <CustomerDetailsField label="Logradouro" value={formatOptionalValue(customer.street)} />
        <CustomerDetailsField label="Número" value={formatOptionalValue(customer.addressNumber)} />
        <CustomerDetailsField
          label="Complemento"
          value={formatOptionalValue(customer.addressComplement)}
        />
        <CustomerDetailsField label="Bairro" value={formatOptionalValue(customer.neighborhood)} />
        <CustomerDetailsField label="Cidade" value={formatOptionalValue(customer.city)} />
        <CustomerDetailsField label="Estado" value={formatOptionalValue(customer.state)} />
      </CustomerDetailsSection>

      <CustomerDetailsSection title="Observações">
        <CustomerDetailsField
          label="Observações"
          value={<span className="pre-line">{formatOptionalValue(customer.notes)}</span>}
        />
      </CustomerDetailsSection>

      <CustomerDetailsSection title="Informações do cadastro">
        <CustomerDetailsField label="Identificador" value={customer.id} />
        <CustomerDetailsField label="Data de criação" value={formatDateTime(customer.createdAt)} />
        <CustomerDetailsField label="Última atualização" value={formatDateTime(customer.updatedAt)} />
      </CustomerDetailsSection>
    </div>
  );
}

function getLoadErrorMessage(code: string): string {
  switch (code) {
    case 'DATABASE_ERROR':
      return 'Não foi possível carregar os dados do cliente.';
    case 'VALIDATION_ERROR':
      return 'Cliente inválido.';
    default:
      return 'Ocorreu um erro inesperado ao carregar o cliente.';
  }
}

function getStatusErrorMessage(code: string): string {
  switch (code) {
    case 'CUSTOMER_NOT_FOUND':
      return 'Cliente não encontrado.';
    case 'DATABASE_ERROR':
      return 'Não foi possível atualizar a situação do cliente.';
    default:
      return 'Ocorreu um erro inesperado ao atualizar o cliente.';
  }
}
