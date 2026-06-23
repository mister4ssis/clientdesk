import type { CreateCustomerInput } from '@shared/customers/customer.dto';
import type { Customer } from '@shared/customers/customer.types';

export const completeIndividualInput: CreateCustomerInput = {
  personType: 'FISICA',
  legalName: 'Maria Silva',
  tradeName: null,
  taxId: '123.456.789-01',
  email: ' MARIA.SILVA@EXAMPLE.TEST ',
  phone: '(31) 99999-0001',
  birthDate: '1990-01-10',
  postalCode: '30123-456',
  street: 'Rua Ficticia',
  addressNumber: '100',
  addressComplement: 'Sala 1',
  neighborhood: 'Centro',
  city: 'Belo Horizonte',
  state: 'mg',
  notes: 'Cliente de teste.',
  active: true
};

export const minimalIndividualInput: CreateCustomerInput = {
  personType: 'FISICA',
  legalName: 'Joao Teste',
  taxId: null
};

export const completeCompanyInput: CreateCustomerInput = {
  personType: 'JURIDICA',
  legalName: 'Empresa Exemplo LTDA',
  tradeName: 'Empresa Exemplo',
  taxId: '12.345.678/0001-90',
  email: 'contato@empresa.example.test',
  phone: '(11) 3333-0002',
  postalCode: '01001-000',
  street: 'Avenida Ficticia',
  addressNumber: '200',
  addressComplement: null,
  neighborhood: 'Comercial',
  city: 'Sao Paulo',
  state: 'SP',
  notes: null,
  active: true
};

export const minimalCompanyInput: CreateCustomerInput = {
  personType: 'JURIDICA',
  legalName: 'Empresa Minima LTDA',
  taxId: null
};

export const activeCustomerFixture: Customer = {
  id: '00000000-0000-4000-8000-000000000001',
  personType: 'FISICA',
  legalName: 'Maria Silva',
  tradeName: null,
  taxId: '12345678901',
  email: 'maria.silva@example.test',
  phone: '31999990001',
  birthDate: '1990-01-10',
  postalCode: '30123456',
  street: 'Rua Ficticia',
  addressNumber: '100',
  addressComplement: null,
  neighborhood: 'Centro',
  city: 'Belo Horizonte',
  state: 'MG',
  notes: null,
  active: true,
  createdAt: '2026-06-22T10:00:00.000Z',
  updatedAt: '2026-06-22T10:00:00.000Z'
};

export const inactiveCustomerFixture: Customer = {
  ...activeCustomerFixture,
  id: '00000000-0000-4000-8000-000000000002',
  legalName: 'Cliente Inativo',
  taxId: '98765432100',
  active: false
};
