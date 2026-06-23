import { useEffect, useState } from 'react';
import type { SyncStatus } from '@shared/sync/sync.types';
import {
  ClientDeskSyncError,
  getSyncStatus,
  runSyncNow
} from '@renderer/services/sync-client';

interface SyncSectionProps {
  onViewConflicts: () => void;
}

export function SyncSection({ onViewConflicts }: SyncSectionProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus(): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setStatus(await getSyncStatus());
    } catch (error) {
      setErrorMessage(getSyncErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRunNow(): Promise<void> {
    setIsRunning(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const result = await runSyncNow();
      setStatus(result.status);
      setMessage(getRunMessage(result.status));
    } catch (error) {
      setErrorMessage(getSyncErrorMessage(error));
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="settings-section" aria-labelledby="sync-settings-title">
      <div>
        <h2 id="sync-settings-title">Sincronização</h2>
        <p>
          O ClientDesk salva tudo primeiro no banco local. Quando configurado, envia alterações
          pendentes ao Supabase em segundo plano.
        </p>
      </div>

      {isLoading ? <p role="status">Carregando estado da sincronização...</p> : null}

      {status ? (
        <dl className="settings-list" aria-label="Estado da sincronização">
          <div>
            <dt>Status</dt>
            <dd>{formatSyncStatus(status)}</dd>
          </div>
          <div>
            <dt>Pendentes</dt>
            <dd>{status.pendingCount}</dd>
          </div>
          <div>
            <dt>Conflitos</dt>
            <dd>{status.conflictCount}</dd>
          </div>
          <div>
            <dt>Última sincronização</dt>
            <dd>{formatOptionalDateTime(status.lastSuccessfulAt)}</dd>
          </div>
          <div>
            <dt>Último envio</dt>
            <dd>{formatOptionalDateTime(status.lastPushAt)}</dd>
          </div>
          <div>
            <dt>Último recebimento</dt>
            <dd>{formatOptionalDateTime(status.lastPullAt)}</dd>
          </div>
        </dl>
      ) : null}

      {message ? (
        <div className="feedback-message" role="status">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="form-alert" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="settings-section__actions">
        <button
          className="button button--primary"
          type="button"
          disabled={isRunning || status?.enabled === false}
          onClick={() => void handleRunNow()}
        >
          {isRunning ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
        <button
          className="button button--secondary"
          type="button"
          disabled={isRunning}
          onClick={() => void loadStatus()}
        >
          Atualizar estado
        </button>
        <button
          className="button button--secondary"
          type="button"
          disabled={isRunning || status?.conflictCount === 0}
          onClick={onViewConflicts}
        >
          Conflitos pendentes
        </button>
      </div>
    </section>
  );
}

function formatSyncStatus(status: SyncStatus): string {
  if (!status.enabled) {
    return 'Sincronização desabilitada';
  }

  if (status.running) {
    switch (status.direction) {
      case 'PUSHING':
        return 'Enviando alterações';
      case 'PULLING':
        return 'Recebendo alterações';
      case 'RESOLVING_CONFLICT':
        return 'Resolvendo conflito';
      default:
        return 'Sincronizando';
    }
  }

  if (status.conflictCount > 0) {
    return `Conflitos pendentes (${status.conflictCount})`;
  }

  if (status.pendingCount > 0) {
    return `Sincronização pendente (${status.pendingCount})`;
  }

  switch (status.connectivity) {
    case 'ONLINE':
      return 'Online';
    case 'AUTH_ERROR':
      return 'Erro de autenticação';
    case 'REMOTE_ERROR':
      return 'Erro de sincronização';
    case 'DISABLED':
      return 'Sincronização desabilitada';
    default:
      return 'Offline';
  }
}

function formatOptionalDateTime(value: string | null): string {
  if (!value) {
    return 'Não informado';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Não informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function getRunMessage(status: SyncStatus): string {
  if (!status.enabled) {
    return 'Sincronização desabilitada.';
  }

  if (status.lastErrorCode) {
    return 'A sincronização não foi concluída. As alterações permanecerão pendentes.';
  }

  return 'Sincronização concluída.';
}

function getSyncErrorMessage(error: unknown): string {
  if (error instanceof ClientDeskSyncError) {
    switch (error.code) {
      case 'SYNC_DISABLED':
        return 'A sincronização está desabilitada.';
      case 'SYNC_OPERATION_IN_PROGRESS':
        return 'Já existe uma sincronização em andamento.';
      case 'SYNC_AUTH_ERROR':
      case 'SYNC_CONFIGURATION_ERROR':
        return 'A sincronização remota não está configurada corretamente.';
      default:
        return 'Não foi possível sincronizar os dados.';
    }
  }

  return 'Ocorreu um erro inesperado ao sincronizar os dados.';
}
