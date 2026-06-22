import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatOptionalValue,
  formatPersonType,
  formatPhone,
  formatPostalCode,
  formatTaxId
} from '@renderer/pages/customers/customer-display-formatters';

describe('customer display formatters', () => {
  it('formats CPF', () => {
    expect(formatTaxId('12345678900')).toBe('123.456.789-00');
  });

  it('formats CNPJ', () => {
    expect(formatTaxId('12345678000190')).toBe('12.345.678/0001-90');
  });

  it('formats landline phone', () => {
    expect(formatPhone('3133334444')).toBe('(31) 3333-4444');
  });

  it('formats mobile phone', () => {
    expect(formatPhone('31999999999')).toBe('(31) 99999-9999');
  });

  it('formats postal code', () => {
    expect(formatPostalCode('12345678')).toBe('12345-678');
  });

  it('formats date', () => {
    expect(formatDate('2026-06-21')).toBe('21/06/2026');
  });

  it('formats date and time', () => {
    expect(formatDateTime('2026-06-21T10:30:00.000Z')).toContain('21/06/2026');
  });

  it('handles invalid date', () => {
    expect(formatDate('invalid')).toBe('Não informado');
  });

  it('formats person type', () => {
    expect(formatPersonType('FISICA')).toBe('Pessoa física');
    expect(formatPersonType('JURIDICA')).toBe('Pessoa jurídica');
  });

  it('formats null, undefined and empty values', () => {
    expect(formatOptionalValue(null)).toBe('Não informado');
    expect(formatOptionalValue(undefined)).toBe('Não informado');
    expect(formatOptionalValue('')).toBe('Não informado');
  });
});
