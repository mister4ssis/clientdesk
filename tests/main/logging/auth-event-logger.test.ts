import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AuthEventLogger } from '@main/logging/auth-event-logger';

describe('AuthEventLogger', () => {
  it('writes sanitized auth diagnostics to the logs directory', () => {
    const logsPath = mkdtempSync(path.join(os.tmpdir(), 'clientdesk-auth-logs-'));
    const logger = new AuthEventLogger(logsPath, () => ({
      hasSupabaseUrl: true,
      hasPublishableKey: true,
      platform: 'win32',
      packaged: true
    }));

    logger.log({
      event: 'AUTH_SIGN_IN',
      code: 'invalid_credentials',
      status: 'failure',
      message: 'user@example.com password=secret access_token=token refresh_token=refresh'
    });

    const logContents = readFileSync(path.join(logsPath, 'auth.log'), 'utf8');
    const entry = JSON.parse(logContents.trim()) as Record<string, unknown>;

    expect(entry).toMatchObject({
      event: 'AUTH_SIGN_IN',
      code: 'invalid_credentials',
      status: 'failure',
      hasSupabaseUrl: true,
      hasPublishableKey: true,
      platform: 'win32',
      packaged: true
    });
    expect(logContents).not.toContain('user@example.com');
    expect(logContents).not.toContain('secret');
    expect(logContents).not.toContain('token');
    expect(logContents).not.toContain('refresh');
  });
});
