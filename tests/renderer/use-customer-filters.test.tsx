import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomerFilters } from '@renderer/pages/customers/hooks/useCustomerFilters';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCustomerFilters', () => {
  it('starts with active customers', () => {
    const { result } = renderHook(() => useCustomerFilters());

    expect(result.current.status).toBe('ACTIVE');
    expect(result.current.filters).toEqual({ active: true });
  });

  it('changes to inactive customers', () => {
    const { result } = renderHook(() => useCustomerFilters());

    act(() => result.current.setStatus('INACTIVE'));

    expect(result.current.filters).toEqual({ active: false });
  });

  it('changes to all customers', () => {
    const { result } = renderHook(() => useCustomerFilters());

    act(() => result.current.setStatus('ALL'));

    expect(result.current.filters).toEqual({});
  });

  it('debounces search', () => {
    const { result } = renderHook(() => useCustomerFilters());

    act(() => result.current.setSearch('  maria  '));

    expect(result.current.debouncedSearch).toBe('');

    act(() => vi.advanceTimersByTime(399));
    expect(result.current.debouncedSearch).toBe('');

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.debouncedSearch).toBe('maria');
  });

  it('clears search', () => {
    const { result } = renderHook(() => useCustomerFilters());

    act(() => result.current.setSearch('maria'));
    act(() => vi.advanceTimersByTime(400));
    act(() => result.current.clearSearch());
    act(() => vi.advanceTimersByTime(400));

    expect(result.current.search).toBe('');
    expect(result.current.debouncedSearch).toBe('');
  });

  it('converts visual filters to CustomerSearchFilters', () => {
    const { result } = renderHook(() => useCustomerFilters());

    act(() => result.current.setStatus('INACTIVE'));
    act(() => result.current.setSearch('maria'));
    act(() => vi.advanceTimersByTime(400));

    expect(result.current.filters).toEqual({
      search: 'maria',
      active: false
    });
  });
});
