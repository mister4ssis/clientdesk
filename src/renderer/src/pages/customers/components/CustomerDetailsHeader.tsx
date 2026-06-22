import type { Customer } from '@shared/customers/customer.types';
import { CustomerStatusBadge } from './CustomerStatusBadge';

interface CustomerDetailsHeaderProps {
  customer: Customer;
  isUpdatingStatus: boolean;
  onBack: () => void;
  onEdit: () => void;
  onRequestStatusChange: (active: boolean) => void;
}

export function CustomerDetailsHeader({
  customer,
  isUpdatingStatus,
  onBack,
  onEdit,
  onRequestStatusChange
}: CustomerDetailsHeaderProps) {
  const nextActive = !customer.active;

  return (
    <header className="details-header">
      <div className="details-header__breadcrumb">Clientes / Detalhes</div>

      <button className="button button--ghost details-header__back" type="button" onClick={onBack}>
        Voltar
      </button>

      <div className="details-header__content">
        <div>
          <h1 id="customer-details-title">{customer.legalName}</h1>
          {customer.tradeName ? (
            <p className="details-header__subtitle">Nome fantasia: {customer.tradeName}</p>
          ) : null}
          <CustomerStatusBadge active={customer.active} />
        </div>

        <div className="details-header__actions">
          <button className="button button--secondary" type="button" onClick={onEdit}>
            Editar
          </button>
          <button
            className={customer.active ? 'button button--danger' : 'button button--primary'}
            type="button"
            disabled={isUpdatingStatus}
            aria-label={`${customer.active ? 'Inativar' : 'Ativar'} cliente ${customer.legalName}`}
            onClick={() => onRequestStatusChange(nextActive)}
          >
            {isUpdatingStatus ? 'Processando...' : customer.active ? 'Inativar' : 'Ativar'}
          </button>
        </div>
      </div>
    </header>
  );
}
