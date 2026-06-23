import { z } from 'zod';

export const customerPersonTypeSchema = z.enum(['FISICA', 'JURIDICA']);
export const personTypeSchema = customerPersonTypeSchema;

const digitOnlyFields = ['taxId', 'phone', 'postalCode'] as const;

const optionalTextSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().max(5000).nullable().optional()
);

const optionalShortTextSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().max(200).nullable().optional()
);

const optionalDigitTextSchema = z.preprocess(
  (value) => {
    const normalized = emptyStringToNull(value);

    if (typeof normalized !== 'string') {
      return normalized;
    }

    return keepDigitsOnly(normalized);
  },
  z.string().nullable().optional()
);

const optionalEmailSchema = z.preprocess(
  (value) => {
    const normalized = emptyStringToNull(value);

    if (typeof normalized !== 'string') {
      return normalized;
    }

    return normalized.trim().toLowerCase();
  },
  z.string().email('E-mail inválido.').nullable().optional()
);

const optionalStateSchema = z.preprocess(
  (value) => {
    const normalized = emptyStringToNull(value);

    if (typeof normalized !== 'string') {
      return normalized;
    }

    return normalized.trim().toUpperCase();
  },
  z
    .string()
    .regex(/^[A-Z]{2}$/, 'Estado deve possuir exatamente duas letras.')
    .nullable()
    .optional()
);

export const customerIdSchema = z.string().uuid();

const customerBaseInputShape = {
  personType: customerPersonTypeSchema,
  legalName: z
    .string()
    .trim()
    .min(2, 'Nome ou razão social deve possuir pelo menos 2 caracteres.')
    .max(200, 'Nome ou razão social deve possuir no máximo 200 caracteres.'),
  tradeName: optionalShortTextSchema,
  representative: optionalShortTextSchema,
  taxId: optionalDigitTextSchema,
  email: optionalEmailSchema,
  phone: optionalDigitTextSchema,
  birthDate: optionalTextSchema,
  postalCode: optionalDigitTextSchema,
  street: optionalShortTextSchema,
  addressNumber: optionalShortTextSchema,
  addressComplement: optionalShortTextSchema,
  neighborhood: optionalShortTextSchema,
  city: optionalShortTextSchema,
  state: optionalStateSchema,
  notes: optionalTextSchema,
  active: z.boolean().default(true)
} satisfies z.ZodRawShape;

export const customerBaseInputObjectSchema = z.object(customerBaseInputShape);

export const customerBaseInputSchema = customerBaseInputObjectSchema.superRefine((value, context) => {
  validateTaxIdLength(value.personType, value.taxId, context);
});

export const createCustomerSchema = customerBaseInputSchema;
export const updateCustomerSchema = customerBaseInputObjectSchema.partial().superRefine((value, context) => {
  if (value.personType && value.taxId) {
    validateTaxIdLength(value.personType, value.taxId, context);
  }
});

export const customerSearchFiltersSchema = z.object({
  search: z.preprocess(emptyStringToUndefined, z.string().trim().optional()),
  active: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional()
});

export const customerDtoSchema = z.object({
  ...customerBaseInputShape,
  id: customerIdSchema,
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

function emptyStringToNull(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function keepDigitsOnly(value: string): string | null {
  const digits = value.replace(/\D/g, '');

  return digits.length > 0 ? digits : null;
}

function validateTaxIdLength(
  personType: 'FISICA' | 'JURIDICA',
  taxId: string | null | undefined,
  context: z.RefinementCtx
): void {
  if (!taxId) {
    return;
  }

  const expectedLength = personType === 'FISICA' ? 11 : 14;

  if (taxId.length !== expectedLength) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['taxId'],
      message:
        personType === 'FISICA'
          ? 'CPF deve possuir 11 dígitos.'
          : 'CNPJ deve possuir 14 dígitos.'
    });
  }
}

export function normalizeDigits(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return keepDigitsOnly(value);
}

export function isDigitOnlyField(fieldName: string): boolean {
  return digitOnlyFields.includes(fieldName as (typeof digitOnlyFields)[number]);
}
