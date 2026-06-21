import { describe, expect, it } from 'vitest';
import { createCustomerSchema } from '@shared/customers/customer.schemas';

describe('customer schemas', () => {
  it('accepts a valid individual customer', () => {
    const customer = createCustomerSchema.parse({
      personType: 'FISICA',
      legalName: 'Maria Silva',
      taxId: '123.456.789-01',
      email: ' MARIA@EXAMPLE.COM ',
      phone: '(11) 99999-8888',
      postalCode: '01310-000',
      state: 'sp',
      tradeName: ''
    });

    expect(customer.taxId).toBe('12345678901');
    expect(customer.email).toBe('maria@example.com');
    expect(customer.phone).toBe('11999998888');
    expect(customer.postalCode).toBe('01310000');
    expect(customer.state).toBe('SP');
    expect(customer.tradeName).toBeNull();
    expect(customer.active).toBe(true);
  });

  it('accepts a valid company customer', () => {
    const customer = createCustomerSchema.parse({
      personType: 'JURIDICA',
      legalName: 'ClientDesk Tecnologia Ltda',
      taxId: '12.345.678/0001-90'
    });

    expect(customer.taxId).toBe('12345678000190');
  });

  it('rejects an empty legal name', () => {
    const result = createCustomerSchema.safeParse({
      personType: 'FISICA',
      legalName: ''
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = createCustomerSchema.safeParse({
      personType: 'FISICA',
      legalName: 'Maria Silva',
      email: 'invalid-email'
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid CPF length for individual customers', () => {
    const result = createCustomerSchema.safeParse({
      personType: 'FISICA',
      legalName: 'Maria Silva',
      taxId: '123'
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid CNPJ length for company customers', () => {
    const result = createCustomerSchema.safeParse({
      personType: 'JURIDICA',
      legalName: 'ClientDesk Tecnologia Ltda',
      taxId: '123'
    });

    expect(result.success).toBe(false);
  });

  it('converts optional empty strings to null', () => {
    const customer = createCustomerSchema.parse({
      personType: 'FISICA',
      legalName: 'Joao Silva',
      tradeName: ' ',
      notes: ''
    });

    expect(customer.tradeName).toBeNull();
    expect(customer.notes).toBeNull();
  });
});
