import { unmaskValue } from './unmask-value';

export function formatPostalCode(value: string | null | undefined): string {
  const digits = unmaskValue(value).slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
