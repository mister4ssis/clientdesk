import { formatPhone as formatPhoneInput } from '@renderer/utils/format-phone';
import { formatTaxId as formatTaxIdInput } from '@renderer/utils/format-tax-id';

export function formatTaxId(value: string | null | undefined): string {
  if (!value) {
    return 'Não informado';
  }

  const digits = value.replace(/\D/g, '');

  if (digits.length === 11) {
    return formatTaxIdInput(digits, 'FISICA');
  }

  if (digits.length === 14) {
    return formatTaxIdInput(digits, 'JURIDICA');
  }

  return digits || 'Não informado';
}

export function formatPhone(value: string | null | undefined): string {
  if (!value) {
    return 'Não informado';
  }

  const digits = value.replace(/\D/g, '');

  if (digits.length === 10 || digits.length === 11) {
    return formatPhoneInput(digits);
  }

  return digits || 'Não informado';
}
