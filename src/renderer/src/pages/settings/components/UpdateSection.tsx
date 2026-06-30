import { useEffect, useState } from 'react';
import type { UpdateState } from '@shared/update/update.types';
import {
  checkForUpdate,
  ClientDeskUpdateError,
  downloadUpdate,
  getUpdateState,
  installUpdate
} from '@renderer/services/update-client';

type UpdateAction = 'check' | 'download' | 'install' | null;

export function UpdateSection() {
  const [state, setState] = useState<UpdateState | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<UpdateAction>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void refreshState();
  }, []);

  async function refreshState(): Promise<void> {
    setLoading(true);
    setErrorMessage(null);

    try {
      setState(await getUpdateState());
    } catch (error) {
      setErrorMessage(getUpdateErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function runAction(nextAction: Exclude<UpdateAction, null>): Promise<void> {
    setAction(nextAction);
    setMessage(null);
    setErrorMessage(null);

    try {
      const result =
        nextAction === 'check'
          ? await checkForUpdate()
          : nextAction === 'download'
            ? await downloadUpdate()
            : await installUpdate();

      setState(result.state);
      setMessage(getUpdateMessage(result.state));
    } catch (error) {
      setErrorMessage(getUpdateErrorMessage(error));
      await refreshState();
    } finally {
      setAction(null);
    }
  }

  const busy = action !== null;

  return (
    <section className="settings-section" aria-labelledby="update-settings-title">
      <div>
        <h2 id="update-settings-title">Atualizações</h2>
        <p>
          Verifique novas versões publicadas pelo canal configurado. A instalação só ocorre após
          confirmação e quando não houver operação crítica em andamento.
        </p>
      </div>

      {loading ? <p role="status">Carregando estado das atualizações...</p> : null}

      {state ? (
        <dl className="settings-list" aria-label="Estado das atualizações">
          <div>
            <dt>Versão atual</dt>
            <dd>{state.currentVersion}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{formatUpdateStatus(state)}</dd>
          </div>
          <div>
            <dt>Versão disponível</dt>
            <dd>{state.availableVersion ?? 'Não informado'}</dd>
          </div>
          <div>
            <dt>Progresso</dt>
            <dd>{formatDownloadPercent(state.downloadPercent)}</dd>
          </div>
          <div>
            <dt>Última verificação</dt>
            <dd>{formatOptionalDateTime(state.lastCheckedAt)}</dd>
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
          className="button button--secondary"
          type="button"
          disabled={busy || state?.status === 'DISABLED'}
          onClick={() => void runAction('check')}
        >
          {action === 'check' ? 'Verificando...' : 'Verificar atualizações'}
        </button>
        <button
          className="button button--secondary"
          type="button"
          disabled={busy || state?.status !== 'UPDATE_AVAILABLE'}
          onClick={() => void runAction('download')}
        >
          {action === 'download' ? 'Baixando...' : 'Baixar atualização'}
        </button>
        <button
          className="button button--primary"
          type="button"
          disabled={busy || state?.status !== 'DOWNLOADED'}
          onClick={() => {
            if (window.confirm('Reiniciar o ClientDesk e instalar a atualização agora?')) {
              void runAction('install');
            }
          }}
        >
          Reiniciar e instalar
        </button>
        <button
          className="button button--secondary"
          type="button"
          disabled={busy}
          onClick={() => void refreshState()}
        >
          Atualizar estado
        </button>
      </div>
    </section>
  );
}

function formatUpdateStatus(state: UpdateState): string {
  switch (state.status) {
    case 'DISABLED':
      return 'Atualizações desabilitadas.';
    case 'CHECKING':
      return 'Verificando atualizações.';
    case 'UPDATE_AVAILABLE':
      return 'Uma nova versão do ClientDesk está disponível.';
    case 'UPDATE_NOT_AVAILABLE':
      return 'Você está usando a versão mais recente.';
    case 'DOWNLOADING':
      return `Baixando atualização: ${formatDownloadPercent(state.downloadPercent)}.`;
    case 'DOWNLOADED':
      return 'A atualização está pronta para ser instalada.';
    case 'INSTALLING':
      return 'Instalando atualização.';
    case 'ERROR':
      return 'Não foi possível verificar ou baixar a atualização.';
    default:
      return 'Nenhuma verificação em andamento.';
  }
}

function getUpdateMessage(state: UpdateState): string {
  if (state.status === 'UPDATE_NOT_AVAILABLE') {
    return 'Você está usando a versão mais recente.';
  }

  if (state.status === 'UPDATE_AVAILABLE') {
    return 'Uma nova versão do ClientDesk está disponível.';
  }

  if (state.status === 'DOWNLOADED') {
    return 'A atualização está pronta para ser instalada.';
  }

  if (state.status === 'DISABLED') {
    return 'Atualizações desabilitadas.';
  }

  return 'Estado de atualização atualizado.';
}

function getUpdateErrorMessage(error: unknown): string {
  if (error instanceof ClientDeskUpdateError) {
    switch (error.code) {
      case 'UPDATE_INSTALL_BLOCKED':
        return 'Conclua a operação atual antes de instalar a atualização.';
      case 'UPDATE_DISABLED':
        return 'As atualizações automáticas estão desabilitadas.';
      case 'UPDATE_NOT_AVAILABLE':
        return 'Você está usando a versão mais recente.';
      case 'UPDATE_NOT_DOWNLOADED':
        return 'A atualização ainda não foi baixada.';
      default:
        return 'Não foi possível verificar ou baixar a atualização.';
    }
  }

  return 'Ocorreu um erro inesperado ao atualizar o estado das atualizações.';
}

function formatDownloadPercent(value: number | null): string {
  return value === null ? 'Não informado' : `${value}%`;
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
