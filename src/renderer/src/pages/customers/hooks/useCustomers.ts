import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Customer, CustomerSearchFilters } from '@shared/customers/customer.types';
import {
  ClientDeskClientError,
  listCustomers,
  setCustomerActive as setCustomerActiveRequest
} from '@renderer/services/customer-client';

interface UseCustomersResult {
  customers: Customer[];
  total: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: ClientDeskClientError | null;
  operatingCustomerId: string | null;
  reload: () => Promise<void>;
  setCustomerActive: (id: string, active: boolean) => Promise<void>;
}

export function useCustomers(filters: CustomerSearchFilters): UseCustomersResult {
  const stableFilters = useMemo<CustomerSearchFilters>(
    () => ({
      ...(filters.search ? { search: filters.search } : {}),
      ...(typeof filters.active === 'boolean' ? { active: filters.active } : {}),
      ...(typeof filters.limit === 'number' ? { limit: filters.limit } : {}),
      ...(typeof filters.offset === 'number' ? { offset: filters.offset } : {})
    }),
    [filters.search, filters.active, filters.limit, filters.offset]
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ClientDeskClientError | null>(null);
  const [operatingCustomerId, setOperatingCustomerId] = useState<string | null>(null);
  const latestRequestId = useRef(0);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;

    if (hasLoadedRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await listCustomers(stableFilters);

      if (requestId !== latestRequestId.current) {
        return;
      }

      setCustomers(result.items);
      setTotal(result.total);
      setError(null);
      hasLoadedRef.current = true;
    } catch (loadError) {
      if (requestId !== latestRequestId.current) {
        return;
      }

      setError(toClientError(loadError, 'load'));
    } finally {
      if (requestId === latestRequestId.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [stableFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  const setCustomerActive = useCallback(
    async (id: string, active: boolean) => {
      setOperatingCustomerId(id);

      try {
        await setCustomerActiveRequest(id, active);
        await load();
      } catch (operationError) {
        setError(toClientError(operationError, 'status'));
      } finally {
        setOperatingCustomerId(null);
      }
    },
    [load]
  );

  return {
    customers,
    total,
    isLoading,
    isRefreshing,
    error,
    operatingCustomerId,
    reload: load,
    setCustomerActive
  };
}

function toClientError(error: unknown, context: 'load' | 'status'): ClientDeskClientError {
  if (error instanceof ClientDeskClientError) {
    return new ClientDeskClientError(error.code, mapFriendlyMessage(error.code, context), error.details);
  }

  return new ClientDeskClientError(
    'INTERNAL_ERROR',
    context === 'load'
      ? 'Ocorreu um erro inesperado ao carregar os clientes.'
      : 'Ocorreu um erro inesperado ao atualizar a situação do cliente.'
  );
}

function mapFriendlyMessage(code: string, context: 'load' | 'status'): string {
  if (context === 'status') {
    return 'Não foi possível atualizar a situação do cliente.';
  }

  switch (code) {
    case 'DATABASE_ERROR':
      return 'Não foi possível carregar os clientes.';
    case 'VALIDATION_ERROR':
      return 'Os filtros informados são inválidos.';
    case 'INTERNAL_ERROR':
      return 'Ocorreu um erro inesperado ao carregar os clientes.';
    default:
      return 'Não foi possível carregar os clientes.';
  }
}
