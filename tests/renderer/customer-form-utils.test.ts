import { describe, expect, it } from 'vitest';
import { formatPhone } from '@renderer/utils/format-phone';
import { formatPostalCode } from '@renderer/utils/format-postal-code';
import { formatTaxId } from '@renderer/utils/format-tax-id';
import { unmaskValue } from '@renderer/utils/unmask-value';

describe('customer form format utilities', () => {
  it('removes CPF mask', () => {
    expect(unmaskValue('123.456.789-00')).toBe('12345678900');
  });

  it('removes CNPJ mask', () => {
    expect(unmaskValue('12.345.678/0001-90')).toBe('12345678000190');
  });

  it('removes phone mask', () => {
    expect(unmaskValue('(31) 99999-9999')).toBe('31999999999');
  });

  it('removes postal code mask', () => {
    expect(unmaskValue('12345-678')).toBe('12345678');
  });

  it('formats CPF', () => {
    expect(formatTaxId('12345678900', 'FISICA')).toBe('123.456.789-00');
  });

  it('formats CNPJ', () => {
    expect(formatTaxId('12345678000190', 'JURIDICA')).toBe('12.345.678/0001-90');
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

  it('accepts partial values', () => {
    expect(formatTaxId('12345', 'FISICA')).toBe('123.45');
    expect(formatPhone('31999')).toBe('(31) 999');
    expect(formatPostalCode('123')).toBe('123');
  });

  it('accepts null and undefined values', () => {
    expect(formatTaxId(null, 'FISICA')).toBe('');
    expect(formatPhone(undefined)).toBe('');
    expect(formatPostalCode(null)).toBe('');
    expect(unmaskValue(undefined)).toBe('');
  });
});
