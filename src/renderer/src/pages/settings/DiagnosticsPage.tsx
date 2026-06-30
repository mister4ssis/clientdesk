import { useEffect, useState } from 'react';
import { PageHeader } from '@renderer/components/layout/PageHeader';
import {
  ClientDeskDiagnosticsError,
  exportDiagnostics,
  getDiagnosticsSummary,
  listSyncRuns
} from '@renderer/services/diagnostics-client';
import { runSyncNow } from '@renderer/services/sync-client';
import type {
  DiagnosticsSummaryDto,
  SyncRunLogDto
} from '@shared/diagnostics/diagnostics.types';

interface DiagnosticsPageProps {
  onBack: () => void;
}

export function DiagnosticsPage({ onBack }: DiagnosticsPageProps) {
  const [summary, setSummary] = useState<DiagnosticsSummaryDto | null>(null);
  const [runs, setRuns] = useState<SyncRunLogDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh(): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextSummary, nextRuns] = await Promise.all([
        getDiagnosticsSummary(),
        listSyncRuns({ limit: 10 })
      ]);
      setSummary(nextSummary);
      setRuns(nextRuns);
    } catch (error) {
      setErrorMessage(getDiagnosticsErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSyncNow(): Promise<void> {
    setIsSyncing(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await runSyncNow();
      await refresh();
      setMessage('Sincronização solicitada.');
    } catch (error) {
      setErrorMessage(getDiagnosticsErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleExport(): Promise<void> {
    setIsExporting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const result = await exportDiagnostics();

      if (result.success) {
        setMessage(`Diagnóstico exportado: ${result.fileName ?? 'arquivo gerado'}.`);
      } else {
        setMessage('Exportação cancelada.');
      }
    } catch (error) {
      setErrorMessage(getDiagnosticsErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="settings-page" aria-labelledby="diagnostics-title">
      <PageHeader
        title="Diagnóstico"
        subtitle="Resumo sanitizado da sincronização e do ambiente local."
        titleId="diagnostics-title"
        actions={
          <button className="button button--secondary" type="button" onClick={onBack}>
            Voltar
          </button>
        }
      />

      {isLoading ? <p role="status">Carregando diagnóstico...</p> : null}

      {summary ? (
        <>
          <section className="settings-section" aria-labelledby="diagnostics-summary-title">
            <h2 id="diagnostics-summary-title">Resumo</h2>
            <dl className="settings-list">
              <InfoItem label="Versão" value={summary.appVersion} />
              <InfoItem label="Plataforma" value={`${summary.platform} ${summary.arch}`} />
              <InfoItem label="Electron" value={summary.electronVersion} />
              <InfoItem label="Node" value={summary.nodeVersion} />
              <InfoItem label="Schema SQLite" value={String(summary.schemaVersion ?? 'Não informado')} />
              <InfoItem label="Usuário" value={summary.maskedEmail ?? 'Não informado'} />
              <InfoItem label="Autenticação" value={summary.authState.status} />
              <InfoItem label="Instalação" value={summary.installationIdShort} />
              <InfoItem label="Conectividade" value={summary.syncStatus.connectivity} />
              <InfoItem label="Realtime" value={summary.syncStatus.realtimeStatus} />
              <InfoItem label="Outbox pendente" value={String(summary.outboxPendingCount)} />
              <InfoItem label="Conflitos" value={String(summary.conflictCount)} />
              <InfoItem label="Último push" value={formatOptionalDateTime(summary.syncStatus.lastPushAt)} />
              <InfoItem label="Último pull" value={formatOptionalDateTime(summary.syncStatus.lastPullAt)} />
              <InfoItem
                label="Última concluída"
                value={formatOptionalDateTime(summary.syncStatus.lastSuccessfulAt)}
              />
              <InfoItem label="Último erro" value={summary.lastErrorCode ?? 'Nenhum'} />
              <InfoItem label="Integridade" value={summary.integrityCheck === 'ok' ? 'OK' : 'Falha'} />
              <InfoItem
                label="Cursor clientes"
                value={formatCursor(summary.customerCursor)}
              />
            </dl>
          </section>

          <section className="settings-section" aria-labelledby="sync-runs-title">
            <h2 id="sync-runs-title">Últimos ciclos</h2>
            {runs.length === 0 ? (
              <p>Nenhum ciclo registrado.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Motivo</th>
                      <th>Status</th>
                      <th>Início</th>
                      <th>Duração</th>
                      <th>Push</th>
                      <th>Pull</th>
                      <th>Conflitos</th>
                      <th>Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id}>
                        <td>{formatReason(run.reason)}</td>
                        <td>{formatRunStatus(run.status)}</td>
                        <td>{formatOptionalDateTime(run.startedAt)}</td>
                        <td>{run.durationMs === null ? 'Não informado' : `${run.durationMs} ms`}</td>
                        <td>{run.pushProcessedCount}</td>
                        <td>{run.pullProcessedCount}</td>
                        <td>{run.conflictCount}</td>
                        <td>{run.errorCode ?? 'Nenhum'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
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
          disabled={isSyncing}
          onClick={() => void handleSyncNow()}
        >
          {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
        <button
          className="button button--secondary"
          type="button"
          disabled={isLoading}
          onClick={() => void refresh()}
        >
          Atualizar diagnóstico
        </button>
        <button
          className="button button--secondary"
          type="button"
          disabled={isExporting}
          onClick={() => void handleExport()}
        >
          {isExporting ? 'Exportando...' : 'Exportar diagnóstico'}
        </button>
      </div>
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
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

function formatCursor(cursor: DiagnosticsSummaryDto['customerCursor']): string {
  if (!cursor?.lastRemoteUpdatedAt) {
    return 'Não iniciado';
  }

  return formatOptionalDateTime(cursor.lastRemoteUpdatedAt);
}

function formatReason(reason: SyncRunLogDto['reason']): string {
  const labels: Record<SyncRunLogDto['reason'], string> = {
    STARTUP: 'Inicialização',
    PERIODIC: 'Periódica',
    MANUAL: 'Manual',
    LOCAL_CHANGE: 'Alteração local',
    REALTIME_EVENT: 'Realtime',
    RECONNECT: 'Reconexão'
  };

  return labels[reason];
}

function formatRunStatus(status: SyncRunLogDto['status']): string {
  const labels: Record<SyncRunLogDto['status'], string> = {
    RUNNING: 'Em execução',
    SUCCESS: 'Sucesso',
    PARTIAL_SUCCESS: 'Parcial',
    FAILED: 'Falhou',
    CANCELLED: 'Cancelado'
  };

  return labels[status];
}

function getDiagnosticsErrorMessage(error: unknown): string {
  if (error instanceof ClientDeskDiagnosticsError) {
    return 'Não foi possível carregar ou exportar o diagnóstico.';
  }

  return 'Ocorreu um erro inesperado no diagnóstico.';
}
