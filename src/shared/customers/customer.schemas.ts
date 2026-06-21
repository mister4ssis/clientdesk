import { z } from 'zod';

export const customerPersonTypeSchema = z.enum(['FISICA', 'JURIDICA']);

const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

export const customerIdSchema = z.string().uuid();

export const customerBaseInputSchema = z.object({
  personType: customerPersonTypeSchema,
  legalName: z.string().trim().min(1, 'Nome ou razão social é obrigatório.'),
  tradeName: optionalTextSchema,
  taxId: optionalTextSchema,
  email: z.string().trim().email().nullable().optional(),
  phone: optionalTextSchema,
  birthDate: optionalTextSchema,
  postalCode: optionalTextSchema,
  street: optionalTextSchema,
  addressNumber: optionalTextSchema,
  addressComplement: optionalTextSchema,
  neighborhood: optionalTextSchema,
  city: optionalTextSchema,
  state: z
    .string()
    .trim()
    .length(2, 'Estado deve possuir exatamente duas letras.')
    .transform((value) => value.toUpperCase())
    .nullable()
    .optional(),
  notes: optionalTextSchema
});

export const createCustomerSchema = customerBaseInputSchema;
export const updateCustomerSchema = customerBaseInputSchema.partial();

export const customerDtoSchema = customerBaseInputSchema.extend({
  id: customerIdSchema,
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
