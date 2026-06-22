import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '@shared/customers/customer.types';
import { ClientDeskClientError } from '@renderer/services/customer-client';
import { useCustomerById } from '@renderer/pages/customers/hooks/useCustomerById';

const customerClientMock = vi.hoisted(() => ({
  getCustomerById: vi.fn(),
  setCustomerActive: vi.fn()
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

beforeEach(() => {
  customerClientMock.getCustomerById.mockReset();
  customerClientMock.setCustomerActive.mockReset();
});

describe('useCustomerById', () => {
  it('loads customer initially', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(activeCustomer);

    const { result } = renderHook(() => useCustomerById(activeCustomer.id));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.customer).toEqual(activeCustomer);
  });

  it('handles missing customer', async () => {
    customerClientMock.getCustomerById.mockRejectedValue(
      new ClientDeskClientError('CUSTOMER_NOT_FOUND', 'not found')
    );

    const { result } = renderHook(() => useCustomerById(activeCustomer.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('handles database error and retries', async () => {
    customerClientMock.getCustomerById
      .mockRejectedValueOnce(new ClientDeskClientError('DATABASE_ERROR', 'database'))
      .mockResolvedValueOnce(activeCustomer);

    const { result } = renderHook(() => useCustomerById(activeCustomer.id));
    await waitFor(() => expect(result.current.error?.code).toBe('DATABASE_ERROR'));

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.customer).toEqual(activeCustomer);
  });

  it('loads again when ID changes', async () => {
    customerClientMock.getCustomerById.mockImplementation(async (id: string) =>
      id === inactiveCustomer.id ? inactiveCustomer : activeCustomer
    );

    const { result, rerender } = renderHook(({ id }) => useCustomerById(id), {
      initialProps: { id: activeCustomer.id }
    });

    await waitFor(() => expect(result.current.customer).toEqual(activeCustomer));
    rerender({ id: inactiveCustomer.id });
    await waitFor(() => expect(result.current.customer).toEqual(inactiveCustomer));
  });

  it('does not let old responses overwrite newer responses', async () => {
    let resolveFirst: (customer: Customer) => void = () => undefined;
    let resolveSecond: (customer: Customer) => void = () => undefined;

    customerClientMock.getCustomerById
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

    const { result, rerender } = renderHook(({ id }) => useCustomerById(id), {
      initialProps: { id: activeCustomer.id }
    });

    rerender({ id: inactiveCustomer.id });
    await waitFor(() => expect(customerClientMock.getCustomerById).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSecond(inactiveCustomer);
    });
    await waitFor(() => expect(result.current.customer).toEqual(inactiveCustomer));

    await act(async () => {
      resolveFirst(activeCustomer);
    });
    expect(result.current.customer).toEqual(inactiveCustomer);
  });

  it('activates and inactivates customer', async () => {
    customerClientMock.getCustomerById.mockResolvedValue(activeCustomer);
    customerClientMock.setCustomerActive
      .mockResolvedValueOnce(inactiveCustomer)
      .mockResolvedValueOnce(activeCustomer);

    const { result } = renderHook(() => useCustomerById(activeCustomer.id));
    await waitFor(() => expect(result.current.customer).toEqual(activeCustomer));

    await act(async () => {
      await result.current.setCustomerActive(false);
    });
    expect(result.current.customer).toEqual(inactiveCustomer);

    await act(async () => {
      await result.current.setCustomerActive(true);
    });
    expect(result.current.customer).toEqual(activeCustomer);
  });

  it('handles status change error and processing state', async () => {
    let rejectStatus: (error: Error) => void = () => undefined;
    customerClientMock.getCustomerById.mockResolvedValue(activeCustomer);
    customerClientMock.setCustomerActive.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectStatus = reject;
        })
    );

    const { result } = renderHook(() => useCustomerById(activeCustomer.id));
    await waitFor(() => expect(result.current.customer).toEqual(activeCustomer));

    void act(() => {
      void result.current.setCustomerActive(false);
    });
    await waitFor(() => expect(result.current.isUpdatingStatus).toBe(true));

    await act(async () => {
      rejectStatus(new ClientDeskClientError('DATABASE_ERROR', 'database'));
    });

    await waitFor(() => expect(result.current.isUpdatingStatus).toBe(false));
    expect(result.current.statusError?.code).toBe('DATABASE_ERROR');
  });
});

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
  id: '00000000-0000-4000-8000-000000000002',
  active: false,
  updatedAt: '2026-06-21T11:00:00.000Z'
};
