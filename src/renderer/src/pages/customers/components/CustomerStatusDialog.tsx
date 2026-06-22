import type { Customer } from '@shared/customers/customer.types';
import { ConfirmDialog } from '@renderer/components/feedback/ConfirmDialog';

interface CustomerStatusDialogProps {
  customer: Customer | null;
  nextActive: boolean | null;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CustomerStatusDialog({
  customer,
  nextActive,
  isBusy,
  onCancel,
  onConfirm
}: CustomerStatusDialogProps) {
  if (!customer || nextActive === null) {
    return null;
  }

  const title = nextActive ? 'Ativar cliente' : 'Inativar cliente';
  const message = nextActive
    ? `Deseja reativar ${customer.legalName}?`
    : `Tem certeza de que deseja inativar ${customer.legalName}? O cadastro continuará armazenado e poderá ser reativado posteriormente.`;

  return (
    <ConfirmDialog
      isOpen
      isBusy={isBusy}
      title={title}
      message={message}
      confirmLabel={nextActive ? 'Ativar cliente' : 'Inativar cliente'}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
