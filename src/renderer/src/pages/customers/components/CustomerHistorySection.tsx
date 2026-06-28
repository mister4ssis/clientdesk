import { useEffect, useState } from 'react';
import type { CustomerAuditEntryDto } from '@shared/audit/audit.types';
import { ClientDeskAuditError, listCustomerHistory } from '@renderer/services/audit-client';

interface CustomerHistorySectionProps {
  customerId: string;
}

const pageSize = 10;

export function CustomerHistorySection({ customerId }: CustomerHistorySectionProps) {
  const [entries, setEntries] = useState<CustomerAuditEntryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadInitial();
  }, [customerId]);

  async function loadInitial(): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await listCustomerHistory(customerId, {
        limit: pageSize,
        offset: 0
      });
      setEntries(result.items);
      setTotal(result.total);
    } catch (error) {
      setErrorMessage(getAuditErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMore(): Promise<void> {
    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      const result = await listCustomerHistory(customerId, {
        limit: pageSize,
        offset: entries.length
      });
      setEntries((current) => [...current, ...result.items]);
      setTotal(result.total);
    } catch (error) {
      setErrorMessage(getAuditErrorMessage(error));
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <section className="details-section" aria-labelledby="customer-history-title">
      <h2 id="customer-history-title">Histórico</h2>

      {isLoading ? <p role="status">Carregando histórico...</p> : null}

      {!isLoading && entries.length === 0 ? (
        <p className="muted-text">Nenhum histórico registrado para este cliente.</p>
      ) : null}

      {entries.length > 0 ? (
        <ol className="timeline-list">
          {entries.map((entry) => (
            <li key={entry.id} className="timeline-list__item">
              <div>
                <strong>{formatAuditOperation(entry.operation)}</strong>
                <span>{formatDateTime(entry.createdAt)}</span>
              </div>
              <p>{formatAuditSource(entry.source)}</p>
              <p>Campos: {formatChangedFields(entry.changedFields)}</p>
              <p>Instalação: {entry.installationIdShort}</p>
            </li>
          ))}
        </ol>
      ) : null}

      {errorMessage ? (
        <div className="form-alert" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {entries.length < total ? (
        <button
          className="button button--secondary"
          type="button"
          disabled={isLoadingMore}
          onClick={() => void loadMore()}
        >
          {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
        </button>
      ) : null}
    </section>
  );
}

function formatAuditOperation(operation: CustomerAuditEntryDto['operation']): string {
  switch (operation) {
    case 'CREATED':
      return 'Cliente cadastrado';
    case 'UPDATED':
      return 'Cliente atualizado';
    case 'ACTIVATED':
      return 'Cliente ativado';
    case 'DEACTIVATED':
      return 'Cliente inativado';
    case 'REMOTE_CREATED':
      return 'Cliente recebido pela sincronização';
    case 'REMOTE_UPDATED':
      return 'Cliente atualizado por outra instalação';
    case 'REMOTE_DELETED':
      return 'Cliente removido remotamente';
    case 'CONFLICT_KEEP_LOCAL':
      return 'Conflito resolvido mantendo os dados deste computador';
    case 'CONFLICT_USE_REMOTE':
      return 'Conflito resolvido utilizando os dados do servidor';
  }
}

function formatAuditSource(source: CustomerAuditEntryDto['source']): string {
  switch (source) {
    case 'LOCAL_USER':
      return 'Alteração local';
    case 'REMOTE_SYNC':
      return 'Sincronização';
    case 'CONFLICT_RESOLUTION':
      return 'Resolução de conflito';
    case 'SYSTEM':
      return 'Sistema';
  }
}

function formatChangedFields(fields: string[]): string {
  if (fields.length === 0) {
    return 'Não informado';
  }

  return fields.map(formatFieldName).join(', ');
}

function formatFieldName(field: string): string {
  const labels: Record<string, string> = {
    personType: 'Tipo de pessoa',
    legalName: 'Nome/Razão social',
    tradeName: 'Nome fantasia',
    representative: 'Representante',
    taxId: 'CPF/CNPJ',
    email: 'E-mail',
    phone: 'Telefone',
    birthDate: 'Data de nascimento',
    postalCode: 'CEP',
    street: 'Logradouro',
    addressNumber: 'Número',
    addressComplement: 'Complemento',
    neighborhood: 'Bairro',
    city: 'Cidade',
    state: 'Estado',
    notes: 'Observações',
    active: 'Situação',
    deletedAt: 'Remoção lógica'
  };

  return labels[field] ?? field;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Não informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function getAuditErrorMessage(error: unknown): string {
  if (error instanceof ClientDeskAuditError) {
    return 'Não foi possível carregar o histórico do cliente.';
  }

  return 'Ocorreu um erro inesperado ao carregar o histórico.';
}
