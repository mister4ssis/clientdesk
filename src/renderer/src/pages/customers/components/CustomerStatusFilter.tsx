import type { CustomerStatusFilter as CustomerStatusFilterValue } from '../hooks/useCustomerFilters';

interface CustomerStatusFilterProps {
  value: CustomerStatusFilterValue;
  onChange: (value: CustomerStatusFilterValue) => void;
}

const options: Array<{ value: CustomerStatusFilterValue; label: string }> = [
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
  { value: 'ALL', label: 'Todos' }
];

export function CustomerStatusFilter({ value, onChange }: CustomerStatusFilterProps) {
  return (
    <fieldset className="status-filter" aria-label="Filtrar por situação">
      <legend>Situação</legend>
      <div className="segmented-control">
        {options.map((option) => (
          <button
            key={option.value}
            className="segmented-control__button"
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
