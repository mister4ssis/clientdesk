import { ApplicationError } from '../errors/application-error';
import { ErrorCode } from '../errors/error-codes';
import { createIpcSuccess } from '@shared/ipc/ipc-result';
import type { IpcFailure, IpcResult } from '@shared/ipc/ipc-result';
import type { IpcMainInvokeEvent } from 'electron';
import { ZodError } from 'zod';

type IpcOperation<TData> = (
  event: IpcMainInvokeEvent,
  ...args: unknown[]
) => TData | Promise<TData>;

export function createIpcHandler<TData>(
  channel: string,
  handler: IpcOperation<TData>
): (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<IpcResult<TData>> {
  return async (event, ...args) => {
    logIpcStart(channel);

    try {
      return createIpcSuccess<TData>(await handler(event, ...args));
    } catch (error) {
      logIpcError(channel, error);

      return toIpcFailure(error);
    }
  };
}

export function toIpcFailure(error: unknown): IpcResult<never> {
  if (error instanceof ApplicationError) {
    return {
      success: false,
      error: toPublicApplicationError(error)
    };
  }

  if (error instanceof ZodError) {
    return {
      success: false,
      error: {
        code: ErrorCode.ValidationError,
        message: 'Os dados informados são inválidos.',
        details: error.flatten()
      }
    };
  }

  return {
    success: false,
    error: {
      code: ErrorCode.InternalError,
      message: 'Ocorreu um erro inesperado.'
    }
  };
}

export function isIpcFailure(result: IpcResult<unknown>): result is IpcFailure {
  return result.success === false;
}

function toPublicApplicationError(error: ApplicationError): IpcFailure['error'] {
  switch (error.code) {
    case ErrorCode.ValidationError:
      return {
        code: error.code,
        message: 'Os dados informados são inválidos.',
        details: error.details
      };
    case ErrorCode.CustomerNotFound:
      return {
        code: error.code,
        message: 'Cliente não encontrado.'
      };
    case ErrorCode.CustomerTaxIdAlreadyExists:
      return {
        code: error.code,
        message: 'Já existe um cliente com este CPF ou CNPJ.'
      };
    case ErrorCode.DatabaseError:
      return {
        code: error.code,
        message: 'Não foi possível acessar os dados dos clientes.'
      };
    case ErrorCode.AuthInvalidCredentials:
    case ErrorCode.AuthSupabaseInvalidCredentials:
      return {
        code: error.code,
        message: 'E-mail ou senha inválidos.'
      };
    case ErrorCode.AuthEmailNotConfirmed:
      return {
        code: error.code,
        message: 'Confirme seu e-mail antes de entrar.'
      };
    case ErrorCode.AuthNetworkError:
    case ErrorCode.AuthFetchFailed:
      return {
        code: error.code,
        message: 'Não foi possível conectar ao servidor. Verifique sua internet.'
      };
    case ErrorCode.AuthOfflineUnavailable:
      return {
        code: error.code,
        message: 'Não foi possível entrar sem conexão. Conecte-se à internet para realizar o primeiro acesso neste computador.'
      };
    case ErrorCode.AuthSessionExpired:
      return {
        code: error.code,
        message: 'Sua sessão expirou. Entre novamente para continuar sincronizando.'
      };
    case ErrorCode.AuthNotAuthenticated:
      return {
        code: error.code,
        message: 'É necessário entrar para continuar.'
      };
    case ErrorCode.AuthConfigurationError:
      return {
        code: error.code,
        message: 'Esta instalação não possui a configuração necessária para acessar o servidor.'
      };
    case ErrorCode.AuthStorageUnavailable:
      return {
        code: error.code,
        message: 'Não foi possível inicializar a autenticação.'
      };
    case ErrorCode.BackupCreateFailed:
      return {
        code: error.code,
        message: 'Não foi possível criar o backup.'
      };
    case ErrorCode.BackupRestoreFailed:
      return {
        code: error.code,
        message: 'Não foi possível restaurar o backup.'
      };
    case ErrorCode.BackupInvalidFile:
      return {
        code: error.code,
        message: 'O arquivo selecionado não é um backup válido do ClientDesk.'
      };
    case ErrorCode.BackupIncompatibleVersion:
      return {
        code: error.code,
        message: 'O backup foi criado por uma versão incompatível do ClientDesk.'
      };
    case ErrorCode.BackupOperationInProgress:
      return {
        code: error.code,
        message: 'Já existe uma operação de backup ou restauração em andamento.'
      };
    case ErrorCode.BackupCancelled:
      return {
        code: error.code,
        message: 'Operação cancelada.'
      };
    case ErrorCode.SyncOperationInProgress:
      return {
        code: error.code,
        message: 'Já existe uma sincronização em andamento.'
      };
    case ErrorCode.SyncDisabled:
      return {
        code: error.code,
        message: 'A sincronização está desabilitada.'
      };
    case ErrorCode.SyncNetworkUnavailable:
      return {
        code: error.code,
        message: 'Não foi possível conectar ao Supabase.'
      };
    case ErrorCode.SyncAuthError:
    case ErrorCode.SyncConfigurationError:
      return {
        code: error.code,
        message: 'A sincronização remota não está configurada corretamente.'
      };
    case ErrorCode.SyncDuplicateTaxId:
      return {
        code: error.code,
        message: 'Já existe um cliente remoto com este CPF ou CNPJ.'
      };
    case ErrorCode.SyncRemoteError:
    case ErrorCode.SyncValidationError:
      return {
        code: error.code,
        message: 'Não foi possível sincronizar os dados.'
      };
    case ErrorCode.SyncConflict:
      return {
        code: error.code,
        message: 'Existe um conflito de sincronização para este cliente.'
      };
    case ErrorCode.SyncConflictNotFound:
      return {
        code: error.code,
        message: 'Conflito não encontrado.'
      };
    case ErrorCode.SyncPullDisabled:
      return {
        code: error.code,
        message: 'A sincronização remota para este computador está desabilitada.'
      };
    case ErrorCode.UpdateDisabled:
      return {
        code: error.code,
        message: 'As atualizações automáticas estão desabilitadas.'
      };
    case ErrorCode.UpdateInstallBlocked:
      return {
        code: error.code,
        message: 'Conclua a operação atual antes de instalar a atualização.'
      };
    case ErrorCode.UpdateNotAvailable:
      return {
        code: error.code,
        message: 'Você está usando a versão mais recente.'
      };
    case ErrorCode.UpdateNotDownloaded:
      return {
        code: error.code,
        message: 'A atualização ainda não foi baixada.'
      };
    case ErrorCode.UpdateCheckFailed:
    case ErrorCode.UpdateDownloadFailed:
      return {
        code: error.code,
        message: 'Não foi possível verificar ou baixar a atualização.'
      };
    default:
      return {
        code: ErrorCode.InternalError,
        message: 'Ocorreu um erro inesperado.'
      };
  }
}

export function logIpcError(channel: string, error: unknown): void {
  const diagnostic = createErrorDiagnostic(error);

  if (isDevelopmentRuntime()) {
    console.error('IPC operation failed.', {
      channel,
      ...diagnostic
    });
    return;
  }

  console.error('IPC operation failed.', {
    channel,
    name: diagnostic.name,
    code: diagnostic.code
  });
}

function logIpcStart(channel: string): void {
  if (!isDevelopmentRuntime()) {
    return;
  }

  console.debug('IPC operation started.', { channel });
}

function createErrorDiagnostic(error: unknown): {
  name: string;
  code: string;
  message?: string;
  cause?: unknown;
  stack?: string;
} {
  if (error instanceof ApplicationError) {
    return {
      name: error.name,
      code: error.code,
      message: sanitizeDiagnosticText(error.message),
      cause: summarizeCause(error.cause),
      stack: sanitizeDiagnosticText(error.stack)
    };
  }

  if (error instanceof ZodError) {
    return {
      name: error.name,
      code: ErrorCode.ValidationError,
      message: 'Os dados informados são inválidos.',
      cause: sanitizeDiagnosticText(error.message),
      stack: sanitizeDiagnosticText(error.stack)
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      code: ErrorCode.InternalError,
      message: sanitizeDiagnosticText(error.message),
      cause: summarizeCause(error.cause),
      stack: sanitizeDiagnosticText(error.stack)
    };
  }

  return {
    name: 'UnknownError',
    code: ErrorCode.InternalError,
    message: sanitizeDiagnosticText(String(error))
  };
}

function summarizeCause(cause: unknown): unknown {
  if (!cause) {
    return undefined;
  }

  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: sanitizeDiagnosticText(cause.message),
      stack: sanitizeDiagnosticText(cause.stack)
    };
  }

  return sanitizeDiagnosticText(String(cause));
}

function sanitizeDiagnosticText(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  const secretPattern =
    /(access[_-]?token|refresh[_-]?token|supabase[_-]?service[_-]?role[_-]?key|supabase[_-]?publishable[_-]?key|supabase[_-]?anon[_-]?key)\s*[:=]\s*["']?[\w.-]+/gi;

  return value
    .replace(secretPattern, '$1=[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b\d{11,14}\b/g, '[REDACTED_DOCUMENT]')
    .replace(/\b\d{10,11}\b/g, '[REDACTED_PHONE]');
}

function isDevelopmentRuntime(): boolean {
  return process.env.NODE_ENV === 'development' || Boolean(process.env.ELECTRON_RENDERER_URL);
}
