import type { BackupValidationResult, RestoreResult } from '@shared/backup/backup.types';
import { ConfirmDialog } from '@renderer/components/feedback/ConfirmDialog';

interface RestoreSectionProps {
  isProcessing: boolean;
  restoreResult: RestoreResult | null;
  validationResult: BackupValidationResult | null;
  errorMessage: string | null;
  confirmRestoreOpen: boolean;
  onOpenRestoreConfirmation: () => void;
  onCancelRestoreConfirmation: () => void;
  onConfirmRestore: () => void;
  onValidateBackup: () => void;
}

export function RestoreSection({
  isProcessing,
  restoreResult,
  validationResult,
  errorMessage,
  confirmRestoreOpen,
  onOpenRestoreConfirmation,
  onCancelRestoreConfirmation,
  onConfirmRestore,
  onValidateBackup
}: RestoreSectionProps) {
  return (
    <section className="settings-section" aria-labelledby="restore-section-title">
      <div>
        <h2 id="restore-section-title">Restaurar backup</h2>
        <p role="note">
          Os dados atuais serão substituídos. Antes da restauração, o ClientDesk cria
          uma cópia de segurança do banco atual.
        </p>
      </div>

      <div className="settings-section__actions">
        <button
          className="button button--secondary"
          type="button"
          disabled={isProcessing}
          onClick={onValidateBackup}
        >
          {isProcessing ? 'Validando...' : 'Validar backup'}
        </button>
        <button
          className="button button--danger"
          type="button"
          disabled={isProcessing}
          onClick={onOpenRestoreConfirmation}
        >
          Selecionar backup
        </button>
      </div>

      {validationResult ? (
        <div className={validationResult.valid ? 'feedback-message' : 'form-alert'} role="status">
          {validationResult.valid
            ? `Backup válido. Versão das migrations: ${validationResult.version ?? 0}.`
            : `Backup inválido: ${validationResult.reason ?? 'arquivo não compatível.'}`}
        </div>
      ) : null}

      {restoreResult?.success ? (
        <div className="feedback-message" role="status">
          Backup restaurado com sucesso.
        </div>
      ) : null}

      {restoreResult && !restoreResult.success ? (
        <div className="feedback-message" role="status">
          Restauração cancelada.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="form-alert" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={confirmRestoreOpen}
        isBusy={isProcessing}
        title="Restaurar backup"
        message="Os dados atuais serão substituídos pelos dados do backup selecionado. Antes da restauração, o ClientDesk criará uma cópia de segurança do banco atual. Deseja continuar?"
        confirmLabel="Continuar restauração"
        onCancel={onCancelRestoreConfirmation}
        onConfirm={onConfirmRestore}
      />
    </section>
  );
}
