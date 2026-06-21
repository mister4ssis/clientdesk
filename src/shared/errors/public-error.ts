export interface PublicError {
  code:
    | 'VALIDATION_ERROR'
    | 'CUSTOMER_NOT_FOUND'
    | 'CUSTOMER_TAX_ID_ALREADY_EXISTS'
    | 'DATABASE_ERROR'
    | 'UNEXPECTED_ERROR';
  message: string;
}
