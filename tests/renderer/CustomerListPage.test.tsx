import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '@shared/customers/customer.types';
import { ClientDeskClientError } from '@renderer/services/customer-client';
import { CustomerListPage } from '@renderer/pages/customers/CustomerListPage';

const customerClientMock = vi.hoisted(() => ({
  listCustomers: vi.fn(),
  setCustomerActive: vi.fn()
}));

vi.mock('@renderer/services/customer-client', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/customer-client')>(
    '@renderer/services/customer-client'
  );

  return {
    ...actual,
    listCustomers: customerClientMock.listCustomers,
    setCustomerActive: customerClientMock.setCustomerActive
  };
});

beforeEach(() => {
  customerClientMock.listCustomers.mockReset();
  customerClientMock.setCustomerActive.mockReset();
});

describe('CustomerListPage', () => {
  it('shows initial loading state', () => {
    customerClientMock.listCustomers.mockImplementation(() => new Promise(() => undefined));

    render(<CustomerListPage />);

    expect(screen.getByText('Carregando clientes...')).toBeInTheDocument();
  });

  it('shows customers', async () => {
    mockCustomerList([activeCustomer]);

    render(<CustomerListPage />);

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-01')).toBeInTheDocument();
    expect(screen.getByText('(11) 99999-8888')).toBeInTheDocument();
    expect(screen.getByText('maria@example.com')).toBeInTheDocument();
  });

  it('shows not informed values', async () => {
    mockCustomerList([{ ...activeCustomer, taxId: null, phone: null, email: null }]);

    render(<CustomerListPage />);

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getAllByText('Não informado')).toHaveLength(3);
  });

  it('shows active badge', async () => {
    mockCustomerList([activeCustomer]);

    render(<CustomerListPage />);

    expect(await screen.findByText('Ativo')).toBeInTheDocument();
  });

  it('shows inactive badge', async () => {
    mockCustomerList([inactiveCustomer]);

    render(<CustomerListPage />);

    expect(await screen.findByText('Inativo')).toBeInTheDocument();
  });

  it('shows empty state when there are no customers', async () => {
    mockCustomerList([]);

    render(<CustomerListPage />);

    expect(await screen.findByText('Nenhum cliente cadastrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastrar primeiro cliente' })).toBeInTheDocument();
  });

  it('shows empty state for search without results', async () => {
    customerClientMock.listCustomers
      .mockResolvedValueOnce({ items: [activeCustomer], total: 1 })
      .mockResolvedValueOnce({ items: [], total: 0 });

    render(<CustomerListPage />);
    await screen.findByText('Maria Silva');

    fireEvent.change(screen.getByLabelText('Pesquisar clientes'), {
      target: { value: 'xpto' }
    });
    await advanceDebounce();

    expect(await screen.findByText('Nenhum cliente encontrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('searches customers with debounce', async () => {
    customerClientMock.listCustomers
      .mockResolvedValueOnce({ items: [activeCustomer], total: 1 })
      .mockResolvedValueOnce({ items: [activeCustomer], total: 1 });

    render(<CustomerListPage />);
    await screen.findByText('Maria Silva');

    fireEvent.change(screen.getByLabelText('Pesquisar clientes'), {
      target: { value: ' maria ' }
    });

    expect(customerClientMock.listCustomers).toHaveBeenCalledTimes(1);
    await advanceDebounce();

    await waitFor(() =>
      expect(customerClientMock.listCustomers).toHaveBeenLastCalledWith({
        search: 'maria',
        active: true
      })
    );
  });

  it('filters active customers', async () => {
    mockCustomerList([activeCustomer]);

    render(<CustomerListPage />);

    await screen.findByText('Maria Silva');

    expect(customerClientMock.listCustomers).toHaveBeenLastCalledWith({ active: true });
  });

  it('filters inactive customers', async () => {
    customerClientMock.listCustomers
      .mockResolvedValueOnce({ items: [activeCustomer], total: 1 })
      .mockResolvedValueOnce({ items: [inactiveCustomer], total: 1 });

    render(<CustomerListPage />);
    await screen.findByText('Maria Silva');

    fireEvent.click(screen.getByRole('button', { name: 'Inativos' }));

    await waitFor(() =>
      expect(customerClientMock.listCustomers).toHaveBeenLastCalledWith({ active: false })
    );
  });

  it('filters all customers', async () => {
    customerClientMock.listCustomers
      .mockResolvedValueOnce({ items: [activeCustomer], total: 1 })
      .mockResolvedValueOnce({ items: [activeCustomer, inactiveCustomer], total: 2 });

    render(<CustomerListPage />);
    await screen.findByText('Maria Silva');

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));

    await waitFor(() => expect(customerClientMock.listCustomers).toHaveBeenLastCalledWith({}));
  });

  it('opens confirmation before inactivation', async () => {
    mockCustomerList([activeCustomer]);

    render(<CustomerListPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Inativar cliente Maria Silva' }));

    expect(screen.getByRole('dialog', { name: 'Inativar cliente' })).toBeInTheDocument();
    expect(screen.getByText(/continuará armazenado/)).toBeInTheDocument();
  });

  it('cancels inactivation', async () => {
    mockCustomerList([activeCustomer]);

    render(<CustomerListPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Inativar cliente Maria Silva' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(customerClientMock.setCustomerActive).not.toHaveBeenCalled();
  });

  it('confirms inactivation', async () => {
    mockCustomerList([activeCustomer]);
    customerClientMock.setCustomerActive.mockResolvedValue({ ...activeCustomer, active: false });

    render(<CustomerListPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Inativar cliente Maria Silva' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inativar cliente' }));

    await waitFor(() =>
      expect(customerClientMock.setCustomerActive).toHaveBeenCalledWith(activeCustomer.id, false)
    );
    expect(await screen.findByText('Cliente inativado com sucesso.')).toBeInTheDocument();
  });

  it('activates customer', async () => {
    mockCustomerList([inactiveCustomer]);
    customerClientMock.setCustomerActive.mockResolvedValue({ ...inactiveCustomer, active: true });

    render(<CustomerListPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Ativar cliente Carlos Souza' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ativar cliente' }));

    await waitFor(() =>
      expect(customerClientMock.setCustomerActive).toHaveBeenCalledWith(inactiveCustomer.id, true)
    );
    expect(await screen.findByText('Cliente ativado com sucesso.')).toBeInTheDocument();
  });

  it('shows friendly error', async () => {
    customerClientMock.listCustomers.mockRejectedValue(
      new ClientDeskClientError('DATABASE_ERROR', 'technical message')
    );

    render(<CustomerListPage />);

    expect(await screen.findByText('Não foi possível carregar os clientes.')).toBeInTheDocument();
    expect(screen.queryByText('technical message')).not.toBeInTheDocument();
  });

  it('allows retrying after error', async () => {
    customerClientMock.listCustomers
      .mockRejectedValueOnce(new ClientDeskClientError('DATABASE_ERROR', 'technical message'))
      .mockResolvedValueOnce({ items: [activeCustomer], total: 1 });

    render(<CustomerListPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
  });

  it('has accessible action button names', async () => {
    mockCustomerList([activeCustomer]);

    render(<CustomerListPage />);

    const row = await screen.findByRole('row', { name: /Maria Silva/ });

    expect(
      within(row).getByRole('button', { name: 'Visualizar cliente Maria Silva' })
    ).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Editar cliente Maria Silva' })).toBeInTheDocument();
    expect(
      within(row).getByRole('button', { name: 'Inativar cliente Maria Silva' })
    ).toBeInTheDocument();
  });
});

function mockCustomerList(customers: Customer[]): void {
  customerClientMock.listCustomers.mockResolvedValue({
    items: customers,
    total: customers.length
  });
}

async function advanceDebounce(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 450));
  });
}

const activeCustomer: Customer = {
  id: '00000000-0000-4000-8000-000000000001',
  personType: 'FISICA',
  legalName: 'Maria Silva',
  tradeName: null,
  taxId: '12345678901',
  email: 'maria@example.com',
  phone: '11999998888',
  birthDate: null,
  postalCode: null,
  street: null,
  addressNumber: null,
  addressComplement: null,
  neighborhood: null,
  city: null,
  state: 'SP',
  notes: null,
  active: true,
  createdAt: '2026-06-21T10:00:00.000Z',
  updatedAt: '2026-06-21T10:00:00.000Z'
};

const inactiveCustomer: Customer = {
  ...activeCustomer,
  id: '00000000-0000-4000-8000-000000000002',
  legalName: 'Carlos Souza',
  taxId: '12345678000190',
  email: null,
  phone: null,
  active: false
};
