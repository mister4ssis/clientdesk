import { useEffect, useState } from 'react';
import type { SyncConflictDetails, SyncConflictSummary } from '@shared/sync/sync.types';
import { ConfirmDialog } from '@renderer/components/feedback/ConfirmDialog';
import { EmptyState } from '@renderer/components/feedback/EmptyState';
import { ErrorState } from '@renderer/components/feedback/ErrorState';
import { LoadingState } from '@renderer/components/feedback/LoadingState';
import { PageHeader } from '@renderer/components/layout/PageHeader';
import {
  ClientDeskSyncError,
  getSyncConflict,
  listSyncConflicts,
  resolveSyncConflictKeepLocal,
  resolveSyncConflictUseRemote
} from '@renderer/services/sync-client';

interface SyncConflictsPageProps {
  onBack: () => void;
}

type ResolutionAction = 'KEEP_LOCAL' | 'USE_REMOTE';

export function SyncConflictsPage({ onBack }: SyncConflictsPageProps) {
  const [conflicts, setConflicts] = useState<SyncConflictSummary[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflictDetails | null>(null);
  const [pendingAction, setPendingAction] = useState<ResolutionAction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadConflicts();
  }, []);

  async function loadConflicts(): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const loadedConflicts = await listSyncConflicts();
      setConflicts(loadedConflicts);
      setSelectedConflict(
        loadedConflicts[0] ? await getSyncConflict(loadedConflicts[0].id) : null
      );
    } catch (error) {
      setErrorMessage(getConflictErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function selectConflict(conflictId: string): Promise<void> {
    setErrorMessage(null);
    setSelectedConflict(await getSyncConflict(conflictId));
  }

  async function confirmResolution(): Promise<void> {
    if (!selectedConflict || !pendingAction) {
      return;
    }

    setIsResolving(true);
    setErrorMessage(null);

    try {
      if (pendingAction === 'KEEP_LOCAL') {
        await resolveSyncConflictKeepLocal(selectedConflict.id);
        setFeedbackMessage('Conflito resolvido mantendo os dados deste computador.');
      } else {
        await resolveSyncConflictUseRemote(selectedConflict.id);
        setFeedbackMessage('Conflito resolvido usando os dados do servidor.');
      }

      setPendingAction(null);
      await loadConflicts();
    } catch (error) {
      setErrorMessage(getConflictErrorMessage(error));
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <section className="settings-page" aria-labelledby="sync-conflicts-title">
      <PageHeader
        title="Conflitos de sincronização"
        subtitle="Revise alterações concorrentes e escolha qual versão manter."
        titleId="sync-conflicts-title"
        actions={
          <button className="button button--secondary" type="button" onClick={onBack}>
            Voltar
          </button>
        }
      />

      {isLoading ? <LoadingState message="Carregando conflitos..." /> : null}

      {!isLoading && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => void loadConflicts()} />
      ) : null}

      {!isLoading && !errorMessage && conflicts.length === 0 ? (
        <EmptyState
          title="Nenhum conflito pendente"
          message="Não há conflitos de sincronização para resolver."
          actionLabel="Voltar para configurações"
          onAction={onBack}
        />
      ) : null}

      {!isLoading && !errorMessage && conflicts.length > 0 ? (
        <div className="conflicts-layout">
          <div className="settings-section">
            <h2>Conflitos pendentes</h2>
            <div className="conflict-list">
              {conflicts.map((conflict) => (
                <button
                  key={conflict.id}
                  className="conflict-list__item"
                  type="button"
                  aria-pressed={selectedConflict?.id === conflict.id}
                  onClick={() => void selectConflict(conflict.id)}
                >
                  <strong>{conflict.customerName}</strong>
                  <span>Local: {formatDateTime(conflict.localUpdatedAt)}</span>
                  <span>Servidor: {formatDateTime(conflict.remoteUpdatedAt)}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedConflict ? (
            <div className="settings-section">
              <h2>{selectedConflict.customerName}</h2>
              <ConflictComparison conflict={selectedConflict} />

              {feedbackMessage ? (
                <div className="feedback-message" role="status">
                  {feedbackMessage}
                </div>
              ) : null}

              <div className="settings-section__actions">
                <button
                  className="button button--primary"
                  type="button"
                  disabled={isResolving}
                  onClick={() => setPendingAction('KEEP_LOCAL')}
                >
                  Manter dados deste computador
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={isResolving}
                  onClick={() => setPendingAction('USE_REMOTE')}
                >
                  Utilizar dados do servidor
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={pendingAction !== null}
        isBusy={isResolving}
        title="Resolver conflito"
        message={
          pendingAction === 'KEEP_LOCAL'
            ? 'Deseja manter os dados deste computador e tentar atualizar o servidor?'
            : 'Deseja substituir os dados locais pelos dados do servidor?'
        }
        confirmLabel="Resolver conflito"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void confirmResolution()}
      />
    </section>
  );
}

function ConflictComparison({ conflict }: { conflict: SyncConflictDetails }) {
  const rows = [
    ['Nome', conflict.localData.legalName, conflict.remoteData.legalName],
    ['Representante', conflict.localData.representative, conflict.remoteData.representative],
    ['CPF/CNPJ', conflict.localData.taxId, conflict.remoteData.taxId],
    ['Telefone', conflict.localData.phone, conflict.remoteData.phone],
    ['E-mail', conflict.localData.email, conflict.remoteData.email],
    [
      'Situação',
      conflict.localData.active ? 'Ativo' : 'Inativo',
      conflict.remoteData.active ? 'Ativo' : 'Inativo'
    ]
  ];

  return (
    <div className="table-wrapper">
      <table className="customers-table">
        <thead>
          <tr>
            <th scope="col">Campo</th>
            <th scope="col">Este computador</th>
            <th scope="col">Servidor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, localValue, remoteValue]) => (
            <tr
              key={label}
              className={localValue !== remoteValue ? 'conflict-row--different' : undefined}
            >
              <th scope="row">{label}</th>
              <td>{formatOptionalValue(localValue)}</td>
              <td>{formatOptionalValue(remoteValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatOptionalValue(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : 'Não informado';
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

function getConflictErrorMessage(error: unknown): string {
  if (error instanceof ClientDeskSyncError) {
    switch (error.code) {
      case 'SYNC_CONFLICT_NOT_FOUND':
        return 'Conflito não encontrado.';
      case 'SYNC_AUTH_ERROR':
      case 'SYNC_CONFIGURATION_ERROR':
        return 'A sincronização remota não está configurada corretamente.';
      default:
        return 'Não foi possível processar os conflitos.';
    }
  }

  return 'Ocorreu um erro inesperado ao processar os conflitos.';
}
