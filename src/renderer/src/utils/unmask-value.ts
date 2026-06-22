export function unmaskValue(value: string | null | undefined): string {
  return value?.replace(/\D/g, '') ?? '';
}
