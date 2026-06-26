import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationError } from '@main/errors/application-error';
import { ErrorCode } from '@main/errors/error-codes';
import { logIpcError } from '@main/ipc/ipc-error-handler';

const originalNodeEnv = process.env.NODE_ENV;
const originalRendererUrl = process.env.ELECTRON_RENDERER_URL;

describe('IPC error logging', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    delete process.env.ELECTRON_RENDERER_URL;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;

    if (originalRendererUrl) {
      process.env.ELECTRON_RENDERER_URL = originalRendererUrl;
    } else {
      delete process.env.ELECTRON_RENDERER_URL;
    }

    vi.restoreAllMocks();
  });

  it('preserves ApplicationError cause and prototype', () => {
    const cause = new Error('root cause');
    const error = new ApplicationError(ErrorCode.DatabaseError, 'database failed', {
      cause
    });

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.name).toBe('ApplicationError');
    expect(error.code).toBe(ErrorCode.DatabaseError);
    expect(error.cause).toBe(cause);
  });

  it('logs detailed sanitized diagnostics in development', () => {
    process.env.NODE_ENV = 'development';

    logIpcError(
      'customers:create',
      new ApplicationError(
        ErrorCode.DatabaseError,
        'Falha 12345678901 user@example.com access_token=secret',
        {
          cause: new Error('Cause 11999998888 refresh_token=secret')
        }
      )
    );

    const serializedLog = JSON.stringify(vi.mocked(console.error).mock.calls);

    expect(console.error).toHaveBeenCalledWith(
      'IPC operation failed.',
      expect.objectContaining({
        channel: 'customers:create',
        name: 'ApplicationError',
        code: ErrorCode.DatabaseError,
        message: expect.stringContaining('[REDACTED_DOCUMENT]'),
        cause: expect.objectContaining({
          message: expect.stringContaining('[REDACTED')
        }),
        stack: expect.any(String)
      })
    );
    expect(serializedLog).not.toContain('12345678901');
    expect(serializedLog).not.toContain('11999998888');
    expect(serializedLog).not.toContain('user@example.com');
    expect(serializedLog).not.toContain('secret');
  });

  it('logs only channel, name, and code outside development', () => {
    process.env.NODE_ENV = 'production';

    logIpcError(
      'customers:list',
      new ApplicationError(ErrorCode.DatabaseError, 'SQLITE_ERROR: /private/path')
    );

    expect(console.error).toHaveBeenCalledWith('IPC operation failed.', {
      channel: 'customers:list',
      name: 'ApplicationError',
      code: ErrorCode.DatabaseError
    });
  });
});
