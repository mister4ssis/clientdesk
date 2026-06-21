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
