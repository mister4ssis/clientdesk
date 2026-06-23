import type { BackupResult } from '@shared/backup/backup.types';

interface BackupSectionProps {
  isProcessing: boolean;
  result: BackupResult | null;
  errorMessage: string | null;
  onCreateBackup: () => void;
}

export function BackupSection({
  isProcessing,
  result,
  errorMessage,
  onCreateBackup
}: BackupSectionProps) {
  return (
    <section className="settings-section" aria-labelledby="backup-section-title">
      <div>
        <h2 id="backup-section-title">Criar backup</h2>
        <p>
          Salve uma cópia local do banco de dados para guardar em um local seguro.
        </p>
      </div>

      <button
        className="button button--primary"
        type="button"
        disabled={isProcessing}
        onClick={onCreateBackup}
      >
        {isProcessing ? 'Criando backup...' : 'Escolher local e criar backup'}
      </button>

      {result?.success ? (
        <div className="feedback-message" role="status">
          Backup criado com sucesso: {result.fileName}
        </div>
      ) : null}

      {result && !result.success ? (
        <div className="feedback-message" role="status">
          Criação de backup cancelada.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="form-alert" role="alert">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}
