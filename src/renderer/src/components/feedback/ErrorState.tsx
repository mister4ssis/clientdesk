interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
}

export function ErrorState({ title = 'Não foi possível carregar os dados', message, onRetry }: ErrorStateProps) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      <button className="button button--secondary" type="button" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  );
}
