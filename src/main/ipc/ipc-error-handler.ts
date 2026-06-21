import { ApplicationError } from '../errors/application-error';
import { ErrorCode } from '../errors/error-codes';
import type { IpcFailure, IpcResult } from '@shared/ipc/ipc-result';

export function toIpcFailure(error: unknown): IpcResult<never> {
  if (error instanceof ApplicationError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.publicMessage
      }
    };
  }

  return {
    ok: false,
    error: {
      code: ErrorCode.UnexpectedError,
      message: 'Ocorreu um erro inesperado.'
    }
  };
}

export function isIpcFailure(result: IpcResult<unknown>): result is IpcFailure {
  return result.ok === false;
}
