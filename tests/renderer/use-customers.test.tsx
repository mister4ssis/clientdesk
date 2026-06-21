import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '@shared/customers/customer.types';
import { ClientDeskClientError } from '@renderer/services/customer-client';
import { useCustomers } from '@renderer/pages/customers/hooks/useCustomers';

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

describe('useCustomers', () => {
  it('loads customers initially', async () => {
    customerClientMock.listCustomers.mockResolvedValue({ items: [sampleCustomer], total: 1 });

    const { result } = renderHook(() => useCustomers({ active: true }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.customers).toEqual([sampleCustomer]);
    expect(result.current.total).toBe(1);
  });

  it('handles successful empty list', async () => {
    customerClientMock.listCustomers.mockResolvedValue({ items: [], total: 0 });

    const { result } = renderHook(() => useCustomers({ active: true }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.customers).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('handles load error', async () => {
    customerClientMock.listCustomers.mockRejectedValue(
      new ClientDeskClientError('DATABASE_ERROR', 'backend message')
    );

    const { result } = renderHook(() => useCustomers({ active: true }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('Não foi possível carregar os clientes.');
  });

  it('reloads customers', async () => {
    customerClientMock.listCustomers
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [sampleCustomer], total: 1 });

    const { result } = renderHook(() => useCustomers({ active: true }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.customers).toEqual([sampleCustomer]);
  });

  it('activates a customer', async () => {
    customerClientMock.listCustomers.mockResolvedValue({ items: [sampleCustomer], total: 1 });
    customerClientMock.setCustomerActive.mockResolvedValue({ ...sampleCustomer, active: true });

    const { result } = renderHook(() => useCustomers({ active: true }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setCustomerActive(sampleCustomer.id, true);
    });

    expect(customerClientMock.setCustomerActive).toHaveBeenCalledWith(sampleCustomer.id, true);
  });

  it('inactivates a customer', async () => {
    customerClientMock.listCustomers.mockResolvedValue({ items: [sampleCustomer], total: 1 });
    customerClientMock.setCustomerActive.mockResolvedValue({ ...sampleCustomer, active: false });

    const { result } = renderHook(() => useCustomers({ active: true }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setCustomerActive(sampleCustomer.id, false);
    });

    expect(customerClientMock.setCustomerActive).toHaveBeenCalledWith(sampleCustomer.id, false);
  });

  it('handles status change error', async () => {
    customerClientMock.listCustomers.mockResolvedValue({ items: [sampleCustomer], total: 1 });
    customerClientMock.setCustomerActive.mockRejectedValue(
      new ClientDeskClientError('DATABASE_ERROR', 'backend message')
    );

    const { result } = renderHook(() => useCustomers({ active: true }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setCustomerActive(sampleCustomer.id, false);
    });

    expect(result.current.error?.message).toBe('Não foi possível atualizar a situação do cliente.');
  });

  it('does not let old responses overwrite newer responses', async () => {
    let resolveFirst: (value: { items: Customer[]; total: number }) => void = () => undefined;
    let resolveSecond: (value: { items: Customer[]; total: number }) => void = () => undefined;

    customerClientMock.listCustomers
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

    const { result, rerender } = renderHook(({ active }) => useCustomers({ active }), {
      initialProps: { active: true }
    });

    rerender({ active: false });

    await act(async () => {
      resolveSecond({ items: [inactiveCustomer], total: 1 });
    });

    await waitFor(() => expect(result.current.customers).toEqual([inactiveCustomer]));

    await act(async () => {
      resolveFirst({ items: [sampleCustomer], total: 1 });
    });

    expect(result.current.customers).toEqual([inactiveCustomer]);
  });
});

const sampleCustomer: Customer = {
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
  ...sampleCustomer,
  id: '00000000-0000-4000-8000-000000000002',
  legalName: 'Carlos Souza',
  active: false
};
