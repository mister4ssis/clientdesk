import type { Customer } from '@shared/customers/customer.types';
import { CustomerTableRow } from './CustomerTableRow';

interface CustomerTableProps {
  customers: Customer[];
  operatingCustomerId: string | null;
  onRequestStatusChange: (customer: Customer, active: boolean) => void;
}

export function CustomerTable({
  customers,
  operatingCustomerId,
  onRequestStatusChange
}: CustomerTableProps) {
  return (
    <div className="table-wrapper">
      <table className="customers-table">
        <thead>
          <tr>
            <th scope="col">Nome ou razão social</th>
            <th scope="col">CPF/CNPJ</th>
            <th scope="col">Telefone</th>
            <th scope="col">E-mail</th>
            <th scope="col">Situação</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <CustomerTableRow
              key={customer.id}
              customer={customer}
              isBusy={operatingCustomerId === customer.id}
              onRequestStatusChange={onRequestStatusChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
