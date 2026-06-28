import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '@shared/customers/customer.types';
import { CustomerDetailsPage } from '@renderer/pages/customers/CustomerDetailsPage';
import { ClientDeskClientError } from '@renderer/services/customer-client';

const customerClientMock = vi.hoisted(() => ({
  getCustomerById: vi.fn(),
  setCustomerActive: vi.fn()
}));
const auditClientMock = vi.hoisted(() => ({
  listCustomerHistory: vi.fn()
}));

vi.mock('@renderer/services/customer-client', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/customer-client')>(
    '@renderer/services/customer-client'
  );

  return {
    ...actual,
    getCustomerById: customerClientMock.getCustomerById,
    setCustomerActive: customerClientMock.setCustomerActive
  };
});

vi.mock('@renderer/services/audit-client', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/audit-client')>(
    '@renderer/services/audit-client'
  );

  return {
    ...actual,
    listCustomerHistory: auditClientMock.listCustomerHistory
  };
});

beforeEach(() => {
  customerClientMock.getCustomerById.mockReset();
  customerClientMock.setCustomerActive.mockReset();
  auditClientMock.listCustomerHistory.mockReset();
  auditClientMock.listCustomerHistory.mockResolvedValue({ items: [], total: 0 });
});

describe('CustomerDetailsPage', () => {
  it('shows loading state', () => {
    customerClientMock.getCustomerById.mockImplementation(() => new Promise(() => undefined));

    renderDetails();

    expect(screen.getByText('Carregando cliente...')).toBeInTheDocument();
  });

  it('shows individual customer details', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(activeCustomer);

    renderDetails();

    expect(await screen.findByRole('heading', { name: 'Maria Silva' })).toBeInTheDocument();
    expect(screen.getByText('Pessoa física')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-00')).toBeInTheDocument();
    expect(screen.getByText('(31) 99999-9999')).toBeInTheDocument();
    expect(screen.getByText('12345-678')).toBeInTheDocument();
    expect(screen.getByText('10/01/1990')).toBeInTheDocument();
    expect(screen.getAllByText(/21\/06\/2026/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ativo').length).toBeGreaterThan(0);
  });

  it('shows sanitized customer history', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(activeCustomer);
    auditClientMock.listCustomerHistory.mockResolvedValue({
      total: 1,
      items: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          customerId: activeCustomer.id,
          operation: 'UPDATED',
          source: 'LOCAL_USER',
          changedFields: ['legalName', 'phone'],
          installationIdShort: '22222222-222',
          localVersion: '2026-06-21T11:00:00.000Z',
          remoteVersion: null,
          createdAt: '2026-06-21T11:00:00.000Z'
        }
      ]
    });

    renderDetails();

    expect(await screen.findByText('Cliente atualizado')).toBeInTheDocument();
    expect(screen.getByText('Campos: Nome/Razão social, Telefone')).toBeInTheDocument();
    expect(screen.queryByText('remoteVersion')).not.toBeInTheDocument();
  });

  it('shows company details and not informed values', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(companyCustomer);

    renderDetails({ customerId: companyCustomer.id });

    expect(await screen.findByRole('heading', { name: 'Empresa Exemplo LTDA' })).toBeInTheDocument();
    expect(screen.getByText('Pessoa jurídica')).toBeInTheDocument();
    expect(screen.getByText('Nome fantasia: Empresa Exemplo')).toBeInTheDocument();
    expect(screen.getByText('12.345.678/0001-90')).toBeInTheDocument();
    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
  });

  it('shows inactive badge', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(inactiveCustomer);

    renderDetails();

    expect((await screen.findAllByText('Inativo')).length).toBeGreaterThan(0);
  });

  it('navigates back and to edit', async () => {
    const onBack = vi.fn();
    const onEdit = vi.fn();
    customerClientMock.getCustomerById.mockResolvedValue(activeCustomer);

    renderDetails({ onBack, onEdit });

    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(activeCustomer.id);
  });

  it('opens and cancels inactivation confirmation', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(activeCustomer);

    renderDetails();

    fireEvent.click(await screen.findByRole('button', { name: 'Inativar cliente Maria Silva' }));

    expect(screen.getByRole('dialog', { name: 'Inativar cliente' })).toBeInTheDocument();
    expect(screen.getByText(/cadastro continuará armazenado/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(customerClientMock.setCustomerActive).not.toHaveBeenCalled();
  });

  it('confirms inactivation and shows success', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(activeCustomer);
    customerClientMock.setCustomerActive.mockResolvedValue(inactiveCustomer);

    renderDetails();

    fireEvent.click(await screen.findByRole('button', { name: 'Inativar cliente Maria Silva' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inativar cliente' }));

    await waitFor(() =>
      expect(customerClientMock.setCustomerActive).toHaveBeenCalledWith(activeCustomer.id, false)
    );
    expect(await screen.findByText('Cliente inativado com sucesso.')).toBeInTheDocument();
    expect(screen.getAllByText('Inativo').length).toBeGreaterThan(0);
  });

  it('activates customer and shows success', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(inactiveCustomer);
    customerClientMock.setCustomerActive.mockResolvedValue(activeCustomer);

    renderDetails();

    fireEvent.click(await screen.findByRole('button', { name: 'Ativar cliente Maria Silva' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ativar cliente' }));

    await waitFor(() =>
      expect(customerClientMock.setCustomerActive).toHaveBeenCalledWith(activeCustomer.id, true)
    );
    expect(await screen.findByText('Cliente ativado com sucesso.')).toBeInTheDocument();
  });

  it('shows status change error without technical message', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(activeCustomer);
    customerClientMock.setCustomerActive.mockRejectedValue(
      new ClientDeskClientError('DATABASE_ERROR', 'SQLITE_BUSY stack trace')
    );

    renderDetails();

    fireEvent.click(await screen.findByRole('button', { name: 'Inativar cliente Maria Silva' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inativar cliente' }));

    expect(await screen.findByText('Não foi possível atualizar a situação do cliente.')).toBeInTheDocument();
    expect(screen.queryByText(/SQLITE_BUSY/)).not.toBeInTheDocument();
  });

  it('shows not found state', async () => {
    const onBack = vi.fn();
    customerClientMock.getCustomerById.mockRejectedValue(
      new ClientDeskClientError('CUSTOMER_NOT_FOUND', 'technical')
    );

    renderDetails({ onBack });

    expect(await screen.findByText('Cliente não encontrado')).toBeInTheDocument();
    expect(screen.queryByText('technical')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para clientes' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows load error and retries', async () => {
    customerClientMock.getCustomerById
      .mockRejectedValueOnce(new ClientDeskClientError('DATABASE_ERROR', 'SQL message'))
      .mockResolvedValueOnce(activeCustomer);

    renderDetails();

    expect(await screen.findByText('Não foi possível carregar os dados do cliente.')).toBeInTheDocument();
    expect(screen.queryByText('SQL message')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Maria Silva' })).toBeInTheDocument();
  });

  it('has accessible action names', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(activeCustomer);

    renderDetails();

    expect(await screen.findByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inativar cliente Maria Silva' })).toBeInTheDocument();
  });
});

function renderDetails({
  customerId = activeCustomer.id,
  onBack = vi.fn(),
  onEdit = vi.fn()
}: {
  customerId?: string;
  onBack?: () => void;
  onEdit?: (id: string) => void;
} = {}) {
  return render(
    <CustomerDetailsPage customerId={customerId} onBack={onBack} onEdit={onEdit} />
  );
}

const activeCustomer: Customer = {
  id: '00000000-0000-4000-8000-000000000001',
  personType: 'FISICA',
  legalName: 'Maria Silva',
  tradeName: null,
  taxId: '12345678900',
  email: 'maria@example.com',
  phone: '31999999999',
  birthDate: '1990-01-10',
  postalCode: '12345678',
  street: 'Rua A',
  addressNumber: '10',
  addressComplement: null,
  neighborhood: 'Centro',
  city: 'Belo Horizonte',
  state: 'MG',
  notes: 'Observação\ncom linha',
  active: true,
  createdAt: '2026-06-21T10:30:00.000Z',
  updatedAt: '2026-06-21T10:30:00.000Z'
};

const inactiveCustomer: Customer = {
  ...activeCustomer,
  active: false,
  updatedAt: '2026-06-21T11:00:00.000Z'
};

const companyCustomer: Customer = {
  ...activeCustomer,
  id: '00000000-0000-4000-8000-000000000002',
  personType: 'JURIDICA',
  legalName: 'Empresa Exemplo LTDA',
  tradeName: 'Empresa Exemplo',
  taxId: '12345678000190',
  phone: null,
  postalCode: null,
  birthDate: null
};
