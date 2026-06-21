import type { Customer, CustomerListResult, CustomerSearchFilters } from './customer.types';

export type CustomerDto = Customer;
export type CustomerListResultDto = CustomerListResult;
export type CustomerSearchFiltersDto = CustomerSearchFilters;

export type EditableCustomerFields = Pick<Customer, 'personType' | 'legalName'> &
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
      | 'active'
    >
  >;

export type CreateCustomerInput = EditableCustomerFields;
export type UpdateCustomerInput = Partial<EditableCustomerFields>;

export type CreateCustomerDto = CreateCustomerInput;
export type UpdateCustomerDto = Partial<CreateCustomerDto>;
