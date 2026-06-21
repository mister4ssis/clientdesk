import type { ErrorCode } from './error-codes';

export class ApplicationError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly publicMessage: string,
    message = publicMessage
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
