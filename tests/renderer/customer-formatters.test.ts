import { describe, expect, it } from 'vitest';
import { formatPhone, formatTaxId } from '@renderer/pages/customers/customer-formatters';

describe('customer formatters', () => {
  it('formats CPF', () => {
    expect(formatTaxId('12345678900')).toBe('123.456.789-00');
  });

  it('formats CNPJ', () => {
    expect(formatTaxId('12345678000190')).toBe('12.345.678/0001-90');
  });

  it('keeps incomplete CPF as digits', () => {
    expect(formatTaxId('123456')).toBe('123456');
  });

  it('keeps incomplete CNPJ as digits', () => {
    expect(formatTaxId('123456780001')).toBe('123456780001');
  });

  it('formats null tax ID as not informed', () => {
    expect(formatTaxId(null)).toBe('Não informado');
  });

  it('formats phone', () => {
    expect(formatPhone('11999998888')).toBe('(11) 99999-8888');
  });

  it('keeps incomplete phone as digits', () => {
    expect(formatPhone('(11) 999')).toBe('11999');
  });
});
