import { useFormContext } from 'react-hook-form';
import type { CustomerFormValues } from '../hooks/useCustomerForm';
import { formatPhone } from '@renderer/utils/format-phone';

export function CustomerContactFields() {
  const {
    register,
    setValue,
    formState: { errors }
  } = useFormContext<CustomerFormValues>();

  return (
    <fieldset className="form-section">
      <legend>Contato</legend>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>

        <div className="field">
          <label htmlFor="phone">Telefone</label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            {...register('phone')}
            onChange={(event) =>
              setValue('phone', formatPhone(event.target.value), {
                shouldDirty: true,
                shouldValidate: false
              })
            }
          />
          <FieldError id="phone-error" message={errors.phone?.message} />
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
