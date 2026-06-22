import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerCreatePage } from '@renderer/pages/customers/CustomerCreatePage';
import { ClientDeskClientError } from '@renderer/services/customer-client';

const customerClientMock = vi.hoisted(() => ({
  createCustomer: vi.fn()
}));

vi.mock('@renderer/services/customer-client', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/customer-client')>(
    '@renderer/services/customer-client'
  );

  return {
    ...actual,
    createCustomer: customerClientMock.createCustomer
  };
});

beforeEach(() => {
  customerClientMock.createCustomer.mockReset();
});

describe('CustomerCreatePage', () => {
  it('renders empty form', () => {
    render(<CustomerCreatePage onCancel={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Novo cliente' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome *')).toHaveValue('');
  });

  it('creates valid customer and returns to list', async () => {
    const onSaved = vi.fn();
    customerClientMock.createCustomer.mockResolvedValue(createdCustomer);

    render(<CustomerCreatePage onCancel={vi.fn()} onSaved={onSaved} />);

    fillValidIndividualForm();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(customerClientMock.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          personType: 'FISICA',
          legalName: 'Maria Silva',
          taxId: '12345678900',
          email: 'maria@example.com'
        })
      )
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shows duplicate tax ID error and keeps values', async () => {
    customerClientMock.createCustomer.mockRejectedValue(
      new ClientDeskClientError('CUSTOMER_TAX_ID_ALREADY_EXISTS', 'duplicate')
    );

    render(<CustomerCreatePage onCancel={vi.fn()} onSaved={vi.fn()} />);

    fillValidIndividualForm();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Já existe um cliente cadastrado com este CPF ou CNPJ.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nome *')).toHaveValue('Maria Silva');
  });

  it('shows validation and database errors', async () => {
    customerClientMock.createCustomer
      .mockRejectedValueOnce(new ClientDeskClientError('VALIDATION_ERROR', 'invalid'))
      .mockRejectedValueOnce(new ClientDeskClientError('DATABASE_ERROR', 'database'));

    render(<CustomerCreatePage onCancel={vi.fn()} onSaved={vi.fn()} />);

    fillValidIndividualForm();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Revise os campos informados.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Não foi possível salvar os dados do cliente.')).toBeInTheDocument();
  });
});

function fillValidIndividualForm(): void {
  fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Maria Silva' } });
  fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '12345678900' } });
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'maria@example.com' } });
}

const createdCustomer = {
  id: '77a155bb-87a7-4e07-a927-877ed0337f24',
  personType: 'FISICA',
  legalName: 'Maria Silva',
  tradeName: null,
  taxId: '12345678900',
  email: 'maria@example.com',
  phone: null,
  birthDate: null,
  postalCode: null,
  street: null,
  addressNumber: null,
  addressComplement: null,
  neighborhood: null,
  city: null,
  state: null,
  notes: null,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
} as const;
