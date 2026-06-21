interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Carregando...' }: LoadingStateProps) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
