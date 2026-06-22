import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '@shared/customers/customer.types';
import { CustomerEditPage } from '@renderer/pages/customers/CustomerEditPage';
import { ClientDeskClientError } from '@renderer/services/customer-client';

const customerClientMock = vi.hoisted(() => ({
  getCustomerById: vi.fn(),
  updateCustomer: vi.fn()
}));

vi.mock('@renderer/services/customer-client', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/customer-client')>(
    '@renderer/services/customer-client'
  );

  return {
    ...actual,
    getCustomerById: customerClientMock.getCustomerById,
    updateCustomer: customerClientMock.updateCustomer
  };
});

beforeEach(() => {
  customerClientMock.getCustomerById.mockReset();
  customerClientMock.updateCustomer.mockReset();
});

describe('CustomerEditPage', () => {
  it('shows loading state', () => {
    customerClientMock.getCustomerById.mockImplementation(() => new Promise(() => undefined));

    render(<CustomerEditPage customerId={customer.id} onCancel={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByText('Carregando cliente...')).toBeInTheDocument();
  });

  it('loads existing customer and fills fields', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(customer);

    render(<CustomerEditPage customerId={customer.id} onCancel={vi.fn()} onSaved={vi.fn()} />);

    expect(await screen.findByDisplayValue('Maria Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123.456.789-00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(31) 99999-9999')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12345-678')).toBeInTheDocument();
  });

  it('updates customer with DTO and returns to list', async () => {
    const onSaved = vi.fn();
    customerClientMock.getCustomerById.mockResolvedValue(customer);
    customerClientMock.updateCustomer.mockResolvedValue({ ...customer, legalName: 'Maria Souza' });

    render(<CustomerEditPage customerId={customer.id} onCancel={vi.fn()} onSaved={onSaved} />);

    const nameInput = await screen.findByLabelText('Nome *');
    fireEvent.change(nameInput, { target: { value: 'Maria Souza' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(customerClientMock.updateCustomer).toHaveBeenCalledWith(
        customer.id,
        expect.not.objectContaining({
          id: expect.anything(),
          createdAt: expect.anything(),
          updatedAt: expect.anything()
        })
      )
    );
    expect(customerClientMock.updateCustomer).toHaveBeenCalledWith(
      customer.id,
      expect.objectContaining({
        legalName: 'Maria Souza',
        taxId: '12345678900'
      })
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('handles not found and load retry', async () => {
    customerClientMock.getCustomerById
      .mockRejectedValueOnce(new ClientDeskClientError('CUSTOMER_NOT_FOUND', 'not found'))
      .mockResolvedValueOnce(customer);

    render(<CustomerEditPage customerId={customer.id} onCancel={vi.fn()} onSaved={vi.fn()} />);

    expect(await screen.findByText('Cliente não encontrado.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByDisplayValue('Maria Silva')).toBeInTheDocument();
  });

  it('keeps values after save error', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(customer);
    customerClientMock.updateCustomer.mockRejectedValue(
      new ClientDeskClientError('DATABASE_ERROR', 'database')
    );

    render(<CustomerEditPage customerId={customer.id} onCancel={vi.fn()} onSaved={vi.fn()} />);

    const nameInput = await screen.findByLabelText('Nome *');
    fireEvent.change(nameInput, { target: { value: 'Maria Souza' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Não foi possível salvar os dados do cliente.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome *')).toHaveValue('Maria Souza');
  });
});

const customer: Customer = {
  id: '77a155bb-87a7-4e07-a927-877ed0337f24',
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
  notes: null,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};
