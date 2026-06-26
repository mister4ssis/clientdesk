import type { ErrorCode } from './error-codes';

interface ApplicationErrorOptions {
  details?: unknown;
  cause?: unknown;
}

export class ApplicationError extends Error {
  readonly details?: unknown;
  override readonly cause?: unknown;

  constructor(
    readonly code: ErrorCode,
    message: string,
    options: ApplicationErrorOptions = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'ApplicationError';
    this.details = options.details;
    this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get publicMessage(): string {
    return this.message;
  }
}
