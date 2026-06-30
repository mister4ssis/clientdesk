import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AuthState } from '@shared/auth/auth.types';
import type { ClientDeskAuthError } from '@renderer/services/auth-client';

interface LoginPageProps {
  authState: AuthState;
  error: ClientDeskAuthError | null;
  isLoading: boolean;
  onLogin(email: string, password: string): Promise<void>;
}

export function LoginPage({ authState, error, isLoading, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFieldError(null);

    if (!email.trim()) {
      setFieldError('Informe o e-mail.');
      emailInputRef.current?.focus();
      return;
    }

    if (!password) {
      setFieldError('Informe a senha.');
      return;
    }

    await onLogin(email, password);
  }

  return (
    <main className="login-page" aria-labelledby="login-title">
      <form className="login-card" onSubmit={(event) => void handleSubmit(event)}>
        <div>
          <p className="login-card__brand">ClientDesk</p>
          <h1 id="login-title">Entrar</h1>
          <p>Acesse sua conta para abrir os dados locais e sincronizar com segurança.</p>
        </div>

        {authState.status === 'SESSION_EXPIRED' ? (
          <div className="form-alert" role="alert">
            Sua sessão expirou. Entre novamente para continuar sincronizando.
          </div>
        ) : null}

        {fieldError ? (
          <div className="form-alert" role="alert">
            {fieldError}
          </div>
        ) : null}

        {error ? (
          <div className="form-alert" role="alert">
            {getAuthErrorMessage(error.code)}
          </div>
        ) : null}

        <label className="field">
          <span>E-mail</span>
          <input
            ref={emailInputRef}
            type="email"
            autoComplete="email"
            value={email}
            disabled={isLoading}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            disabled={isLoading}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <button className="button button--primary" type="submit" disabled={isLoading}>
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'AUTH_INVALID_CREDENTIALS':
    case 'invalid_credentials':
      return 'E-mail ou senha inválidos.';
    case 'email_not_confirmed':
      return 'Confirme seu e-mail antes de entrar.';
    case 'network_error':
    case 'fetch_failed':
      return 'Não foi possível conectar ao servidor. Verifique sua internet.';
    case 'AUTH_CONFIGURATION_ERROR':
      return 'Esta instalação não possui a configuração necessária para acessar o servidor.';
    case 'AUTH_OFFLINE_UNAVAILABLE':
      return 'Não foi possível entrar sem conexão. Conecte-se à internet para realizar o primeiro acesso neste computador.';
    case 'AUTH_SESSION_EXPIRED':
      return 'Sua sessão expirou. Entre novamente para continuar sincronizando.';
    default:
      return 'Não foi possível realizar o acesso. Tente novamente.';
  }
}
