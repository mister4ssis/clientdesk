import type { PersonType } from '@shared/customers/customer.types';
import { formatPhone as formatPhoneInput } from '@renderer/utils/format-phone';
import { formatPostalCode as formatPostalCodeInput } from '@renderer/utils/format-postal-code';
import { formatTaxId as formatTaxIdInput } from '@renderer/utils/format-tax-id';

const NOT_INFORMED = 'Não informado';

export function formatOptionalValue(value: string | null | undefined): string {
  const normalized = value?.trim();

  return normalized ? normalized : NOT_INFORMED;
}

export function formatTaxId(value: string | null | undefined): string {
  const digits = value?.replace(/\D/g, '') ?? '';

  if (!digits) {
    return NOT_INFORMED;
  }

  if (digits.length <= 11) {
    return digits.length === 11 ? formatTaxIdInput(digits, 'FISICA') : digits;
  }

  return digits.length === 14 ? formatTaxIdInput(digits, 'JURIDICA') : digits;
}

export function formatPhone(value: string | null | undefined): string {
  const digits = value?.replace(/\D/g, '') ?? '';

  if (!digits) {
    return NOT_INFORMED;
  }

  return digits.length === 10 || digits.length === 11 ? formatPhoneInput(digits) : digits;
}

export function formatPostalCode(value: string | null | undefined): string {
  const digits = value?.replace(/\D/g, '') ?? '';

  if (!digits) {
    return NOT_INFORMED;
  }

  return digits.length === 8 ? formatPostalCodeInput(digits) : digits;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return NOT_INFORMED;
  }

  const date = parseDate(value);

  if (!date) {
    return NOT_INFORMED;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'UTC'
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return NOT_INFORMED;
  }

  const date = parseDate(value);

  if (!date) {
    return NOT_INFORMED;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

export function formatPersonType(value: PersonType | null | undefined): string {
  if (value === 'FISICA') {
    return 'Pessoa física';
  }

  if (value === 'JURIDICA') {
    return 'Pessoa jurídica';
  }

  return NOT_INFORMED;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}
