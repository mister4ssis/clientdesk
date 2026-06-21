import { useEffect, useMemo, useState } from 'react';
import type { CustomerSearchFilters } from '@shared/customers/customer.types';

export type CustomerStatusFilter = 'ACTIVE' | 'INACTIVE' | 'ALL';

interface UseCustomerFiltersResult {
  search: string;
  debouncedSearch: string;
  status: CustomerStatusFilter;
  filters: CustomerSearchFilters;
  setSearch: (value: string) => void;
  clearSearch: () => void;
  setStatus: (value: CustomerStatusFilter) => void;
}

const debounceMs = 400;

export function useCustomerFilters(): UseCustomerFiltersResult {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<CustomerStatusFilter>('ACTIVE');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const filters = useMemo<CustomerSearchFilters>(() => {
    const nextFilters: CustomerSearchFilters = {};

    if (debouncedSearch.length > 0) {
      nextFilters.search = debouncedSearch;
    }

    if (status === 'ACTIVE') {
      nextFilters.active = true;
    }

    if (status === 'INACTIVE') {
      nextFilters.active = false;
    }

    return nextFilters;
  }, [debouncedSearch, status]);

  return {
    search,
    debouncedSearch,
    status,
    filters,
    setSearch,
    clearSearch: () => setSearch(''),
    setStatus
  };
}
