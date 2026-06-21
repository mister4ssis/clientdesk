import type { PublicError } from '../errors/public-error';

export interface IpcSuccess<TData> {
  success: true;
  data: TData;
}

export interface IpcFailure {
  success: false;
  error: PublicError;
}

export type IpcResult<TData> = IpcSuccess<TData> | IpcFailure;

export function createIpcSuccess<TData>(data: TData): IpcSuccess<TData> {
  return {
    success: true,
    data
  };
}
