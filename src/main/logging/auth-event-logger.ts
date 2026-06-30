import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export interface AuthRuntimeDiagnostic {
  hasSupabaseUrl: boolean;
  hasPublishableKey: boolean;
  platform: string;
  packaged: boolean;
}

export interface AuthLogEntry {
  event: string;
  code: string;
  status: 'success' | 'failure';
  message: string;
  timestamp?: string;
}

export class AuthEventLogger {
  constructor(
    private readonly logsPath: string,
    private readonly getRuntimeDiagnostic: () => AuthRuntimeDiagnostic
  ) {}

  log(entry: AuthLogEntry): void {
    const runtimeDiagnostic = this.getRuntimeDiagnostic();
    const safeEntry = {
      event: sanitizeText(entry.event),
      code: sanitizeText(entry.code),
      status: entry.status,
      message: sanitizeText(entry.message),
      hasSupabaseUrl: runtimeDiagnostic.hasSupabaseUrl,
      hasPublishableKey: runtimeDiagnostic.hasPublishableKey,
      platform: runtimeDiagnostic.platform,
      packaged: runtimeDiagnostic.packaged,
      timestamp: entry.timestamp ?? new Date().toISOString()
    };

    try {
      mkdirSync(this.logsPath, { recursive: true });
      appendFileSync(path.join(this.logsPath, 'auth.log'), `${JSON.stringify(safeEntry)}\n`, 'utf8');
    } catch {
      // Logging is diagnostic only and must never block authentication flow.
    }
  }
}

function sanitizeText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b\d{11,14}\b/g, '[REDACTED_DOCUMENT]')
    .replace(/\b\d{10,11}\b/g, '[REDACTED_PHONE]')
    .replace(
      /(access[_-]?token|refresh[_-]?token|password|senha|key|publishable[_-]?key)\s*[:=]\s*["']?[\w.-]+/gi,
      '[REDACTED_SECRET]'
    );
}
