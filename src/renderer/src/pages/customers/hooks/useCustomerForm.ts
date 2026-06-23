import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import type { CreateCustomerInput } from '@shared/customers/customer.dto';
import type { Customer, PersonType } from '@shared/customers/customer.types';
import { ClientDeskClientError } from '@renderer/services/customer-client';
import { formatPhone } from '@renderer/utils/format-phone';
import { formatPostalCode } from '@renderer/utils/format-postal-code';
import { formatTaxId } from '@renderer/utils/format-tax-id';
import { unmaskValue } from '@renderer/utils/unmask-value';

export interface CustomerFormValues {
  personType: PersonType;
  legalName: string;
  tradeName: string;
  representative: string;
  taxId: string;
  email: string;
  phone: string;
  birthDate: string;
  postalCode: string;
  street: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  notes: string;
  active: boolean;
}

interface UseCustomerFormOptions {
  customer?: Customer | null;
  onSubmit: (input: CreateCustomerInput) => Promise<void>;
  onCancel: () => void;
}

interface UseCustomerFormResult {
  form: UseFormReturn<CustomerFormValues>;
  generalError: string | null;
  isSaving: boolean;
  isConfirmingCancel: boolean;
  handleSubmit: () => void;
  requestCancel: () => void;
  confirmCancel: () => void;
  closeCancelConfirmation: () => void;
}

const optionalTextField = (maxLength: number, message: string) =>
  z.string().trim().max(maxLength, message);

const optionalFreeTextField = z
  .string()
  .trim()
  .max(2000, 'As observações devem possuir no máximo 2000 caracteres.');

const customerFormSchema = z
  .object({
    personType: z.enum(['FISICA', 'JURIDICA']),
    legalName: z
      .string()
      .trim()
      .min(2, 'Informe o nome do cliente.')
      .max(200, 'O nome deve possuir no máximo 200 caracteres.'),
    tradeName: optionalTextField(
      200,
      'O nome fantasia deve possuir no máximo 200 caracteres.'
    ),
    representative: optionalTextField(
      200,
      'O representante deve possuir no máximo 200 caracteres.'
    ),
    taxId: z.string(),
    email: z
      .string()
      .trim()
      .refine((value) => {
        const trimmed = value.trim();

        return trimmed.length === 0 || z.string().email().safeParse(trimmed).success;
      }, 'Informe um e-mail válido.'),
    phone: z.string(),
    birthDate: z.string(),
    postalCode: z.string(),
    street: optionalTextField(200, 'O logradouro deve possuir no máximo 200 caracteres.'),
    addressNumber: optionalTextField(200, 'O número deve possuir no máximo 200 caracteres.'),
    addressComplement: optionalTextField(
      200,
      'O complemento deve possuir no máximo 200 caracteres.'
    ),
    neighborhood: optionalTextField(200, 'O bairro deve possuir no máximo 200 caracteres.'),
    city: optionalTextField(200, 'A cidade deve possuir no máximo 200 caracteres.'),
    state: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || /^[A-Za-z]{2}$/.test(value), {
        message: 'O estado deve conter duas letras.'
      }),
    notes: optionalFreeTextField,
    active: z.boolean()
  })
  .superRefine((value, context) => {
    const taxId = unmaskValue(value.taxId);

    if (!taxId) {
      return;
    }

    if (value.personType === 'FISICA' && taxId.length !== 11) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['taxId'],
        message: 'O CPF deve conter 11 dígitos.'
      });
    }

    if (value.personType === 'JURIDICA' && taxId.length !== 14) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['taxId'],
        message: 'O CNPJ deve conter 14 dígitos.'
      });
    }
  });

export function useCustomerForm({
  customer,
  onSubmit,
  onCancel
}: UseCustomerFormOptions): UseCustomerFormResult {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const isSubmitLockedRef = useRef(false);
  const form = useForm<CustomerFormValues>({
    defaultValues: customerToFormValues(customer ?? null),
    resolver: zodResolver(customerFormSchema),
    mode: 'onSubmit',
    shouldFocusError: true
  });
  const { reset } = form;
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (customer) {
      reset(customerToFormValues(customer));
    }
  }, [customer, reset]);

  async function submit(values: CustomerFormValues): Promise<void> {
    if (isSubmitLockedRef.current) {
      return;
    }

    isSubmitLockedRef.current = true;
    setIsSaving(true);
    setGeneralError(null);

    try {
      await onSubmit(formValuesToInput(values));
    } catch (error) {
      const clientError = toClientError(error);
      applyServerFieldErrors(clientError, form);
      setGeneralError(getSaveErrorMessage(clientError.code));
    } finally {
      isSubmitLockedRef.current = false;
      setIsSaving(false);
    }
  }

  function requestCancel(): void {
    if (!isDirty) {
      onCancel();
      return;
    }

    setIsConfirmingCancel(true);
  }

  return {
    form,
    generalError,
    isSaving,
    isConfirmingCancel,
    handleSubmit: form.handleSubmit((values) => void submit(values)),
    requestCancel,
    confirmCancel: onCancel,
    closeCancelConfirmation: () => setIsConfirmingCancel(false)
  };
}

export function customerToFormValues(customer: Customer | null): CustomerFormValues {
  return {
    personType: customer?.personType ?? 'FISICA',
    legalName: customer?.legalName ?? '',
    tradeName: customer?.tradeName ?? '',
    representative: customer?.representative ?? '',
    taxId: customer?.taxId ? formatTaxId(customer.taxId, customer.personType) : '',
    email: customer?.email ?? '',
    phone: customer?.phone ? formatPhone(customer.phone) : '',
    birthDate: customer?.birthDate?.slice(0, 10) ?? '',
    postalCode: customer?.postalCode ? formatPostalCode(customer.postalCode) : '',
    street: customer?.street ?? '',
    addressNumber: customer?.addressNumber ?? '',
    addressComplement: customer?.addressComplement ?? '',
    neighborhood: customer?.neighborhood ?? '',
    city: customer?.city ?? '',
    state: customer?.state ?? '',
    notes: customer?.notes ?? '',
    active: customer?.active ?? true
  };
}

export function formValuesToInput(values: CustomerFormValues): CreateCustomerInput {
  return {
    personType: values.personType,
    legalName: values.legalName.trim(),
    tradeName: emptyToNull(values.tradeName),
    representative: emptyToNull(values.representative),
    taxId: digitsToNull(values.taxId),
    email: emptyToNull(values.email)?.toLowerCase() ?? null,
    phone: digitsToNull(values.phone),
    birthDate: emptyToNull(values.birthDate),
    postalCode: digitsToNull(values.postalCode),
    street: emptyToNull(values.street),
    addressNumber: emptyToNull(values.addressNumber),
    addressComplement: emptyToNull(values.addressComplement),
    neighborhood: emptyToNull(values.neighborhood),
    city: emptyToNull(values.city),
    state: emptyToNull(values.state)?.toUpperCase() ?? null,
    notes: emptyToNull(values.notes),
    active: values.active
  };
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function digitsToNull(value: string): string | null {
  const digits = unmaskValue(value);

  return digits.length > 0 ? digits : null;
}

function toClientError(error: unknown): ClientDeskClientError {
  if (error instanceof ClientDeskClientError) {
    return error;
  }

  return new ClientDeskClientError('INTERNAL_ERROR', 'Ocorreu um erro inesperado.');
}

function getSaveErrorMessage(code: string): string {
  switch (code) {
    case 'CUSTOMER_TAX_ID_ALREADY_EXISTS':
      return 'Já existe um cliente cadastrado com este CPF ou CNPJ.';
    case 'CUSTOMER_NOT_FOUND':
      return 'Cliente não encontrado.';
    case 'VALIDATION_ERROR':
      return 'Revise os campos informados.';
    case 'DATABASE_ERROR':
      return 'Não foi possível salvar os dados do cliente.';
    default:
      return 'Ocorreu um erro inesperado ao salvar o cliente.';
  }
}

function applyServerFieldErrors(
  error: ClientDeskClientError,
  form: UseFormReturn<CustomerFormValues>
): void {
  if (error.code !== 'VALIDATION_ERROR' || !Array.isArray(error.details)) {
    return;
  }

  for (const detail of error.details) {
    if (!isValidationDetail(detail)) {
      continue;
    }

    form.setError(detail.path, {
      type: 'server',
      message: detail.message
    });
  }
}

function isValidationDetail(
  value: unknown
): value is { path: keyof CustomerFormValues; message: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return typeof record.path === 'string' && record.path in customerFormFieldNames && typeof record.message === 'string';
}

const customerFormFieldNames: Record<keyof CustomerFormValues, true> = {
  personType: true,
  legalName: true,
  tradeName: true,
  representative: true,
  taxId: true,
  email: true,
  phone: true,
  birthDate: true,
  postalCode: true,
  street: true,
  addressNumber: true,
  addressComplement: true,
  neighborhood: true,
  city: true,
  state: true,
  notes: true,
  active: true
};
