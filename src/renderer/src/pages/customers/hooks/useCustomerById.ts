import { useCallback, useEffect, useRef, useState } from 'react';
import type { Customer } from '@shared/customers/customer.types';
import { ClientDeskClientError, getCustomerById } from '@renderer/services/customer-client';

interface UseCustomerByIdResult {
  customer: Customer | null;
  isLoading: boolean;
  error: ClientDeskClientError | null;
  reload: () => Promise<void>;
}

export function useCustomerById(customerId: string | null | undefined): UseCustomerByIdResult {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ClientDeskClientError | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    if (!customerId) {
      setCustomer(null);
      setError(new ClientDeskClientError('VALIDATION_ERROR', 'Cliente inválido.'));
      setIsLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    try {
      const loadedCustomer = await getCustomerById(customerId);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setCustomer(loadedCustomer);
    } catch (caughtError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setCustomer(null);
      setError(toClientError(caughtError));
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [customerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    customer,
    isLoading,
    error,
    reload
  };
}

function toClientError(error: unknown): ClientDeskClientError {
  if (error instanceof ClientDeskClientError) {
    return error;
  }

  return new ClientDeskClientError('INTERNAL_ERROR', 'Ocorreu um erro inesperado.');
}
