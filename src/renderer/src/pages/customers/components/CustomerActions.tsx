import type { Customer } from '@shared/customers/customer.types';

interface CustomerActionsProps {
  customer: Customer;
  isBusy: boolean;
  onRequestStatusChange: (customer: Customer, active: boolean) => void;
  onViewCustomer?: (id: string) => void;
  onEditCustomer?: (id: string) => void;
}

export function CustomerActions({
  customer,
  isBusy,
  onRequestStatusChange,
  onViewCustomer,
  onEditCustomer
}: CustomerActionsProps) {
  const nextActive = !customer.active;

  return (
    <div className="table-actions">
      <button
        className="button button--ghost"
        type="button"
        aria-label={`Visualizar cliente ${customer.legalName}`}
        onClick={() => onViewCustomer?.(customer.id)}
      >
        Visualizar
      </button>
      <button
        className="button button--ghost"
        type="button"
        aria-label={`Editar cliente ${customer.legalName}`}
        onClick={() => onEditCustomer?.(customer.id)}
      >
        Editar
      </button>
      <button
        className={customer.active ? 'button button--danger' : 'button button--secondary'}
        type="button"
        aria-label={`${customer.active ? 'Inativar' : 'Ativar'} cliente ${customer.legalName}`}
        disabled={isBusy}
        onClick={() => onRequestStatusChange(customer, nextActive)}
      >
        {isBusy ? 'Processando...' : customer.active ? 'Inativar' : 'Ativar'}
      </button>
    </div>
  );
}
