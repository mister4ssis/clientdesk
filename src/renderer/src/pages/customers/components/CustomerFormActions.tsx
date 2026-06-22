interface CustomerFormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
}

export function CustomerFormActions({ isSubmitting, onCancel }: CustomerFormActionsProps) {
  return (
    <div className="form-actions">
      <button
        className="button button--secondary"
        type="button"
        disabled={isSubmitting}
        onClick={onCancel}
      >
        Cancelar
      </button>
      <button className="button button--primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  );
}
