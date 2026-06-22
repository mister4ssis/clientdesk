import { FormProvider } from 'react-hook-form';
import type { Customer } from '@shared/customers/customer.types';
import { ConfirmDialog } from '@renderer/components/feedback/ConfirmDialog';
import type { CreateCustomerInput } from '@shared/customers/customer.dto';
import { CustomerAddressFields } from './CustomerAddressFields';
import { CustomerContactFields } from './CustomerContactFields';
import { CustomerFormActions } from './CustomerFormActions';
import { CustomerMainFields } from './CustomerMainFields';
import { useCustomerForm } from '../hooks/useCustomerForm';

interface CustomerFormProps {
  customer?: Customer | null;
  onSubmit: (input: CreateCustomerInput) => Promise<void>;
  onCancel: () => void;
}

export function CustomerForm({ customer = null, onSubmit, onCancel }: CustomerFormProps) {
  const {
    form,
    generalError,
    isSaving,
    isConfirmingCancel,
    handleSubmit,
    requestCancel,
    confirmCancel,
    closeCancelConfirmation
  } = useCustomerForm({
    customer,
    onSubmit,
    onCancel
  });

  const {
    register,
    formState: { errors }
  } = form;

  return (
    <FormProvider {...form}>
      <form className="customer-form" noValidate onSubmit={handleSubmit}>
        {generalError ? (
          <div className="form-alert" role="alert">
            {generalError}
          </div>
        ) : null}

        <CustomerMainFields />
        <CustomerContactFields />
        <CustomerAddressFields />

        <fieldset className="form-section">
          <legend>Observações e situação</legend>

          <div className="field">
            <label htmlFor="notes">Observações</label>
            <textarea
              id="notes"
              rows={5}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? 'notes-error' : undefined}
              {...register('notes')}
            />
            {errors.notes ? (
              <p id="notes-error" className="field-error">
                {errors.notes.message}
              </p>
            ) : null}
          </div>

          <label className="checkbox-field" htmlFor="active">
            <input id="active" type="checkbox" {...register('active')} />
            Cliente ativo
          </label>
        </fieldset>

        <CustomerFormActions isSubmitting={isSaving} onCancel={requestCancel} />
      </form>

      <ConfirmDialog
        isOpen={isConfirmingCancel}
        title="Cancelar edição"
        message="Existem alterações não salvas. Deseja sair mesmo assim?"
        confirmLabel="Sair sem salvar"
        onCancel={closeCancelConfirmation}
        onConfirm={confirmCancel}
      />
    </FormProvider>
  );
}
