export function maskEmail(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    return null;
  }

  const visible = localPart.slice(0, 2);

  return `${visible}${'*'.repeat(Math.max(3, localPart.length - visible.length))}@${domain}`;
}

export function sanitizeErrorCode(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  return /^[A-Z0-9_]+$/.test(code) ? code : 'INTERNAL_ERROR';
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '_');
}
