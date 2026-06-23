import type { Customer } from '@shared/customers/customer.types';
import { CustomerActions } from './CustomerActions';
import { CustomerStatusBadge } from './CustomerStatusBadge';
import { formatPhone, formatTaxId } from '../customer-formatters';

interface CustomerTableRowProps {
  customer: Customer;
  isBusy: boolean;
  onRequestStatusChange: (customer: Customer, active: boolean) => void;
  onViewCustomer?: (id: string) => void;
  onEditCustomer?: (id: string) => void;
}

export function CustomerTableRow({
  customer,
  isBusy,
  onRequestStatusChange,
  onViewCustomer,
  onEditCustomer
}: CustomerTableRowProps) {
  return (
    <tr className={customer.active ? undefined : 'customer-row--inactive'}>
      <td>
        <strong>{customer.legalName}</strong>
      </td>
      <td>{customer.representative ?? 'Não informado'}</td>
      <td>{formatTaxId(customer.taxId)}</td>
      <td>{formatPhone(customer.phone)}</td>
      <td>{customer.email ?? 'Não informado'}</td>
      <td>
        <CustomerStatusBadge active={customer.active} />
      </td>
      <td>
        <CustomerActions
          customer={customer}
          isBusy={isBusy}
          onRequestStatusChange={onRequestStatusChange}
          onViewCustomer={onViewCustomer}
          onEditCustomer={onEditCustomer}
        />
      </td>
    </tr>
  );
}
