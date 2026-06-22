import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import type { CustomerFormValues } from '../hooks/useCustomerForm';
import { formatTaxId } from '@renderer/utils/format-tax-id';

export function CustomerMainFields() {
  const {
    register,
    setValue,
    watch,
    formState: { errors }
  } = useFormContext<CustomerFormValues>();
  const legalNameRef = useRef<HTMLInputElement | null>(null);
  const personType = watch('personType');
  const { ref: legalNameRegisterRef, ...legalNameRegister } = register('legalName');
  const isIndividual = personType === 'FISICA';

  useEffect(() => {
    legalNameRef.current?.focus();
  }, []);

  return (
    <fieldset className="form-section">
      <legend>Dados principais</legend>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="personType">Tipo de pessoa *</label>
          <select id="personType" {...register('personType')}>
            <option value="FISICA">Pessoa física</option>
            <option value="JURIDICA">Pessoa jurídica</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="legalName">{isIndividual ? 'Nome' : 'Razão social'} *</label>
          <input
            id="legalName"
            type="text"
            aria-invalid={Boolean(errors.legalName)}
            aria-describedby={errors.legalName ? 'legalName-error' : undefined}
            {...legalNameRegister}
            ref={(element) => {
              legalNameRegisterRef(element);
              legalNameRef.current = element;
            }}
          />
          <FieldError id="legalName-error" message={errors.legalName?.message} />
        </div>

        {!isIndividual ? (
          <div className="field">
            <label htmlFor="tradeName">Nome fantasia</label>
            <input
              id="tradeName"
              type="text"
              aria-invalid={Boolean(errors.tradeName)}
              aria-describedby={errors.tradeName ? 'tradeName-error' : undefined}
              {...register('tradeName')}
            />
            <FieldError id="tradeName-error" message={errors.tradeName?.message} />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="taxId">{isIndividual ? 'CPF' : 'CNPJ'}</label>
          <input
            id="taxId"
            type="text"
            inputMode="numeric"
            aria-invalid={Boolean(errors.taxId)}
            aria-describedby={errors.taxId ? 'taxId-error' : undefined}
            {...register('taxId')}
            onChange={(event) =>
              setValue('taxId', formatTaxId(event.target.value, personType), {
                shouldDirty: true,
                shouldValidate: false
              })
            }
          />
          <FieldError id="taxId-error" message={errors.taxId?.message} />
        </div>

        {isIndividual ? (
          <div className="field">
            <label htmlFor="birthDate">Data de nascimento</label>
            <input id="birthDate" type="date" {...register('birthDate')} />
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="field-error">
      {message}
    </p>
  ) : null;
}
