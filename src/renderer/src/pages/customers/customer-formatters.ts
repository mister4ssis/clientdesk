export function formatTaxId(value: string | null | undefined): string {
  if (!value) {
    return 'Não informado';
  }

  const digits = value.replace(/\D/g, '');

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(
      8,
      12
    )}-${digits.slice(12)}`;
  }

  return digits || 'Não informado';
}

export function formatPhone(value: string | null | undefined): string {
  if (!value) {
    return 'Não informado';
  }

  const digits = value.replace(/\D/g, '');

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return digits || 'Não informado';
}
