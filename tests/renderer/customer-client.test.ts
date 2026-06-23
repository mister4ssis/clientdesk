import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientDeskApi } from '@shared/ipc/ipc-contracts';
import type { Customer } from '@shared/customers/customer.types';
import {
  ClientDeskClientError,
  createCustomer,
  getCustomerById,
  listCustomers,
  setCustomerActive,
  updateCustomer
} from '@renderer/services/customer-client';

let customersApi: ClientDeskApi['customers'];

beforeEach(() => {
  customersApi = {
    create: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    setActive: vi.fn()
  };

  vi.stubGlobal('window', {
    clientDesk: {
      app: {
        getVersion: vi.fn()
      },
      customers: customersApi
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('renderer customer client', () => {
  it('returns data on success', async () => {
    vi.mocked(customersApi.create).mockResolvedValue({
      success: true,
      data: sampleCustomer
    });

    await expect(
      createCustomer({ personType: 'FISICA', legalName: 'Maria Silva' })
    ).resolves.toEqual(sampleCustomer);
    expect(customersApi.create).toHaveBeenCalledWith({
      personType: 'FISICA',
      legalName: 'Maria Silva'
    });
  });

  it('throws ClientDeskClientError on public error', async () => {
    vi.mocked(customersApi.list).mockResolvedValue({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Os dados informados são inválidos.',
        details: {
          fieldErrors: {
            legalName: ['Obrigatório']
          }
        }
      }
    });

    await expect(listCustomers({ limit: 10 })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details: {
        fieldErrors: {
          legalName: ['Obrigatório']
        }
      }
    } satisfies Partial<ClientDeskClientError>);
  });

  it('calls the expected window.clientDesk customer methods', async () => {
    vi.mocked(customersApi.list).mockResolvedValue({
      success: true,
      data: {
        items: [sampleCustomer],
        total: 1
      }
    });
    vi.mocked(customersApi.getById).mockResolvedValue({ success: true, data: sampleCustomer });
    vi.mocked(customersApi.update).mockResolvedValue({ success: true, data: sampleCustomer });
    vi.mocked(customersApi.setActive).mockResolvedValue({ success: true, data: sampleCustomer });

    await listCustomers({ search: 'maria' });
    await getCustomerById(sampleCustomer.id);
    await updateCustomer(sampleCustomer.id, { legalName: 'Maria Souza' });
    await setCustomerActive(sampleCustomer.id, false);

    expect(customersApi.list).toHaveBeenCalledWith({ search: 'maria' });
    expect(customersApi.getById).toHaveBeenCalledWith(sampleCustomer.id);
    expect(customersApi.update).toHaveBeenCalledWith(sampleCustomer.id, {
      legalName: 'Maria Souza'
    });
    expect(customersApi.setActive).toHaveBeenCalledWith(sampleCustomer.id, false);
  });
});

const sampleCustomer: Customer = {
  id: '00000000-0000-4000-8000-000000000001',
  personType: 'FISICA',
  legalName: 'Maria Silva',
  tradeName: null,
  representative: null,
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
