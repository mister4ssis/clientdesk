interface CustomerStatusBadgeProps {
  active: boolean;
}

export function CustomerStatusBadge({ active }: CustomerStatusBadgeProps) {
  return (
    <span className={active ? 'status-badge status-badge--active' : 'status-badge status-badge--inactive'}>
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}
