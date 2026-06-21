import type { Customer } from './customer.types';

export type CustomerDto = Customer;

export type CreateCustomerDto = Pick<Customer, 'personType' | 'legalName'> &
  Partial<
    Pick<
      Customer,
      | 'tradeName'
      | 'taxId'
      | 'email'
      | 'phone'
      | 'birthDate'
      | 'postalCode'
      | 'street'
      | 'addressNumber'
      | 'addressComplement'
      | 'neighborhood'
      | 'city'
      | 'state'
      | 'notes'
    >
  >;

export type UpdateCustomerDto = Partial<CreateCustomerDto>;
