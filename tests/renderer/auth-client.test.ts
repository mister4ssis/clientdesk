import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthState, signIn } from '@renderer/services/auth-client';

beforeEach(() => {
  window.clientDesk = {
    ...window.clientDesk,
    auth: {
      getState: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn()
    }
  };
});

describe('auth-client', () => {
  it('returns public auth state without tokens', async () => {
    vi.mocked(window.clientDesk.auth.getState).mockResolvedValue({
      success: true,
      data: authState
    });

    await expect(getAuthState()).resolves.toEqual(authState);
    expect(JSON.stringify(authState)).not.toContain('access_token');
    expect(JSON.stringify(authState)).not.toContain('refresh_token');
  });

  it('deduplicates concurrent auth state requests', async () => {
    vi.mocked(window.clientDesk.auth.getState).mockResolvedValue({
      success: true,
      data: authState
    });

    await Promise.all([getAuthState(), getAuthState()]);

    expect(window.clientDesk.auth.getState).toHaveBeenCalledOnce();
  });

  it('preserves sanitized login errors', async () => {
    vi.mocked(window.clientDesk.auth.signIn).mockResolvedValue({
      success: false,
      error: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'E-mail ou senha inválidos.'
      }
    });

    await expect(signIn('user@example.com', 'wrong')).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'E-mail ou senha inválidos.'
    });
  });
});

const authState = {
  status: 'AUTHENTICATED' as const,
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'user@example.com'
  },
  canUseLocalData: true,
  canSynchronize: true
};
