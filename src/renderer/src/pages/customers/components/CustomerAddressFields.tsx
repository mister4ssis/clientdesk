import { useFormContext } from 'react-hook-form';
import type { CustomerFormValues } from '../hooks/useCustomerForm';
import { formatPostalCode } from '@renderer/utils/format-postal-code';

export function CustomerAddressFields() {
  const {
    register,
    setValue,
    formState: { errors }
  } = useFormContext<CustomerFormValues>();

  return (
    <fieldset className="form-section">
      <legend>Endereço</legend>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="postalCode">CEP</label>
          <input
            id="postalCode"
            type="text"
            inputMode="numeric"
            aria-invalid={Boolean(errors.postalCode)}
            aria-describedby={errors.postalCode ? 'postalCode-error' : undefined}
            {...register('postalCode')}
            onChange={(event) =>
              setValue('postalCode', formatPostalCode(event.target.value), {
                shouldDirty: true,
                shouldValidate: false
              })
            }
          />
          <FieldError id="postalCode-error" message={errors.postalCode?.message} />
        </div>

        <div className="field field--wide">
          <label htmlFor="street">Logradouro</label>
          <input id="street" type="text" {...register('street')} />
        </div>

        <div className="field">
          <label htmlFor="addressNumber">Número</label>
          <input id="addressNumber" type="text" {...register('addressNumber')} />
        </div>

        <div className="field">
          <label htmlFor="addressComplement">Complemento</label>
          <input id="addressComplement" type="text" {...register('addressComplement')} />
        </div>

        <div className="field">
          <label htmlFor="neighborhood">Bairro</label>
          <input id="neighborhood" type="text" {...register('neighborhood')} />
        </div>

        <div className="field">
          <label htmlFor="city">Cidade</label>
          <input id="city" type="text" {...register('city')} />
        </div>

        <div className="field">
          <label htmlFor="state">Estado</label>
          <input
            id="state"
            type="text"
            maxLength={2}
            aria-invalid={Boolean(errors.state)}
            aria-describedby={errors.state ? 'state-error' : undefined}
            {...register('state')}
            onChange={(event) =>
              setValue('state', event.target.value.toUpperCase(), {
                shouldDirty: true,
                shouldValidate: false
              })
            }
          />
          <FieldError id="state-error" message={errors.state?.message} />
        </div>
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
