import { ApplicationError } from '../errors/application-error';
import { ErrorCode } from '../errors/error-codes';
import type { IpcFailure, IpcResult } from '@shared/ipc/ipc-result';
import { ZodError } from 'zod';

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

  logSanitizedError(error);

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
      logSanitizedError(error.cause ?? error);
      return {
        code: error.code,
        message: 'Não foi possível acessar os dados dos clientes.'
      };
    case ErrorCode.BackupCreateFailed:
      logSanitizedError(error.cause ?? error);
      return {
        code: error.code,
        message: 'Não foi possível criar o backup.'
      };
    case ErrorCode.BackupRestoreFailed:
      logSanitizedError(error.cause ?? error);
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
    default:
      logSanitizedError(error.cause ?? error);
      return {
        code: ErrorCode.InternalError,
        message: 'Ocorreu um erro inesperado.'
      };
  }
}

function logSanitizedError(error: unknown): void {
  const name = error instanceof Error ? error.name : 'UnknownError';

  console.error('IPC operation failed.', { name });
}
