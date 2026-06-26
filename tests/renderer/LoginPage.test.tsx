import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@renderer/pages/auth/LoginPage';
import { ClientDeskAuthError } from '@renderer/services/auth-client';

describe('LoginPage', () => {
  it('renders login fields and requires email and password', async () => {
    const onLogin = vi.fn();
    render(<LoginPage authState={unauthenticatedState} error={null} isLoading={false} onLogin={onLogin} />);

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe o e-mail.')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('submits credentials and disables button while loading', () => {
    const onLogin = vi.fn(async () => undefined);
    render(<LoginPage authState={unauthenticatedState} error={null} isLoading={true} onLogin={onLogin} />);

    expect(screen.getByRole('button', { name: 'Entrando...' })).toBeDisabled();
  });

  it('shows sanitized invalid credential errors', () => {
    render(
      <LoginPage
        authState={unauthenticatedState}
        error={new ClientDeskAuthError('AUTH_INVALID_CREDENTIALS', 'technical')}
        isLoading={false}
        onLogin={vi.fn()}
      />
    );

    expect(screen.getByText('E-mail ou senha inválidos.')).toBeInTheDocument();
    expect(screen.queryByText('technical')).not.toBeInTheDocument();
  });

  it('calls login with entered values', async () => {
    const onLogin = vi.fn(async () => undefined);
    render(<LoginPage authState={unauthenticatedState} error={null} isLoading={false} onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'user@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'secret' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('user@example.com', 'secret'));
  });
});

const unauthenticatedState = {
  status: 'UNAUTHENTICATED' as const,
  user: null,
  canUseLocalData: false,
  canSynchronize: false
};
