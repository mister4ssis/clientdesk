import type { PublicError } from '../errors/public-error';

export interface IpcSuccess<TData> {
  ok: true;
  data: TData;
}

export interface IpcFailure {
  ok: false;
  error: PublicError;
}

export type IpcResult<TData> = IpcSuccess<TData> | IpcFailure;
