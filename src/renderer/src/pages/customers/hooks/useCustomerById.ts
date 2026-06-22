import { useCallback, useEffect, useRef, useState } from 'react';
import type { Customer } from '@shared/customers/customer.types';
import {
  ClientDeskClientError,
  getCustomerById,
  setCustomerActive as setCustomerActiveClient
} from '@renderer/services/customer-client';

interface UseCustomerByIdResult {
  customer: Customer | null;
  isLoading: boolean;
  isUpdatingStatus: boolean;
  error: ClientDeskClientError | null;
  statusError: ClientDeskClientError | null;
  reload: () => Promise<void>;
  setCustomerActive: (active: boolean) => Promise<Customer | null>;
}

export function useCustomerById(customerId: string | null | undefined): UseCustomerByIdResult {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<ClientDeskClientError | null>(null);
  const [statusError, setStatusError] = useState<ClientDeskClientError | null>(null);
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

  async function setCustomerActive(active: boolean): Promise<Customer | null> {
    if (!customerId || isUpdatingStatus) {
      return null;
    }

    setIsUpdatingStatus(true);
    setStatusError(null);

    try {
      const updatedCustomer = await setCustomerActiveClient(customerId, active);
      setCustomer(updatedCustomer);
      return updatedCustomer;
    } catch (caughtError) {
      const clientError = toClientError(caughtError);
      setStatusError(clientError);
      return null;
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return {
    customer,
    isLoading,
    isUpdatingStatus,
    error,
    statusError,
    reload,
    setCustomerActive
  };
}

function toClientError(error: unknown): ClientDeskClientError {
  if (error instanceof ClientDeskClientError) {
    return error;
  }

  return new ClientDeskClientError('INTERNAL_ERROR', 'Ocorreu um erro inesperado.');
}
