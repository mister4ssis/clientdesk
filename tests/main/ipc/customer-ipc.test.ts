import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationError } from '@main/errors/application-error';
import { ErrorCode } from '@main/errors/error-codes';
import { registerIpcHandlers, type IpcMainLike } from '@main/ipc/register-ipc-handlers';
import type { BackupServiceContract } from '@main/modules/backup/backup.ipc';
import type { CustomerServiceContract } from '@main/modules/customers/customer.ipc';
import type { Customer } from '@shared/customers/customer.types';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import type { IpcResult } from '@shared/ipc/ipc-result';

type RegisteredHandler = Parameters<IpcMain['handle']>[1];

class MockIpcMain implements IpcMainLike {
  readonly handlers = new Map<string, RegisteredHandler>();
  readonly removedChannels: string[] = [];

  handle(channel: string, listener: RegisteredHandler): void {
    this.handlers.set(channel, listener);
  }

  removeHandler(channel: string): void {
    this.removedChannels.push(channel);
    this.handlers.delete(channel);
  }

  async invoke<TData>(channel: string, input?: unknown): Promise<IpcResult<TData>> {
    const handler = this.handlers.get(channel);

    if (!handler) {
      throw new Error(`No handler registered for ${channel}.`);
    }

    return (await handler({} as IpcMainInvokeEvent, input)) as IpcResult<TData>;
  }
}

describe('customer IPC handlers', () => {
  it('registers all channels and removes previous handlers first', () => {
    const ipcMain = new MockIpcMain();

    registerIpcHandlers({
      ipcMain,
      customerService: createCustomerServiceMock(),
      backupService: createBackupServiceMock(),
      getAppVersion: () => '0.1.0'
    });

    expect([...ipcMain.handlers.keys()].sort()).toEqual(
      [
        IPC_CHANNELS.app.getVersion,
        IPC_CHANNELS.backup.create,
        IPC_CHANNELS.backup.restore,
        IPC_CHANNELS.backup.validate,
        IPC_CHANNELS.customers.create,
        IPC_CHANNELS.customers.getById,
        IPC_CHANNELS.customers.list,
        IPC_CHANNELS.customers.setActive,
        IPC_CHANNELS.customers.update
      ].sort()
    );
    expect(ipcMain.removedChannels).toEqual(expect.arrayContaining([...ipcMain.handlers.keys()]));
  });

  it('handles create with valid input', async () => {
    const service = createCustomerServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke<Customer>(IPC_CHANNELS.customers.create, {
      personType: 'FISICA',
      legalName: 'Maria Silva',
      taxId: '12345678901'
    });

    expect(result.success).toBe(true);
    expect(service.create).toHaveBeenCalledOnce();
  });

  it('handles create with invalid input', async () => {
    const service = createCustomerServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke<Customer>(IPC_CHANNELS.customers.create, {
      personType: 'FISICA',
      legalName: 'A'
    });

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.code).toBe(ErrorCode.ValidationError);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('handles list with valid filters', async () => {
    const service = createCustomerServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke(IPC_CHANNELS.customers.list, {
      search: 'maria',
      active: true,
      limit: 10,
      offset: 0
    });

    expect(result.success).toBe(true);
    expect(service.list).toHaveBeenCalledWith({
      search: 'maria',
      active: true,
      limit: 10,
      offset: 0
    });
  });

  it('handles list with invalid filters', async () => {
    const service = createCustomerServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke(IPC_CHANNELS.customers.list, {
      active: 'yes'
    });

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.code).toBe(ErrorCode.ValidationError);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('handles getById with valid ID', async () => {
    const service = createCustomerServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke<Customer>(IPC_CHANNELS.customers.getById, {
      id: sampleCustomer.id
    });

    expect(result.success).toBe(true);
    expect(service.getById).toHaveBeenCalledWith(sampleCustomer.id);
  });

  it('handles getById with invalid ID', async () => {
    const service = createCustomerServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke<Customer>(IPC_CHANNELS.customers.getById, {
      id: 'not-a-uuid'
    });

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.code).toBe(ErrorCode.ValidationError);
    expect(service.getById).not.toHaveBeenCalled();
  });

  it('handles missing customer as public not found error', async () => {
    const service = createCustomerServiceMock({
      getById: () => {
        throw new ApplicationError(ErrorCode.CustomerNotFound, 'internal not found');
      }
    });
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke<Customer>(IPC_CHANNELS.customers.getById, {
      id: sampleCustomer.id
    });

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error).toMatchObject({
      code: ErrorCode.CustomerNotFound,
      message: 'Cliente não encontrado.'
    });
  });

  it('handles update with valid input', async () => {
    const service = createCustomerServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke<Customer>(IPC_CHANNELS.customers.update, {
      id: sampleCustomer.id,
      data: {
        legalName: 'Maria Souza'
      }
    });

    expect(result.success).toBe(true);
    expect(service.update).toHaveBeenCalledWith(sampleCustomer.id, {
      legalName: 'Maria Souza'
    });
  });

  it('handles update with invalid input', async () => {
    const service = createCustomerServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke<Customer>(IPC_CHANNELS.customers.update, {
      id: 'not-a-uuid',
      data: {
        legalName: 'Maria Souza'
      }
    });

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.code).toBe(ErrorCode.ValidationError);
    expect(service.update).not.toHaveBeenCalled();
  });

  it('handles setActive with valid boolean', async () => {
    const service = createCustomerServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke<Customer>(IPC_CHANNELS.customers.setActive, {
      id: sampleCustomer.id,
      active: false
    });

    expect(result.success).toBe(true);
    expect(service.setActive).toHaveBeenCalledWith(sampleCustomer.id, false);
  });

  it('handles setActive with invalid active value', async () => {
    const service = createCustomerServiceMock();
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke<Customer>(IPC_CHANNELS.customers.setActive, {
      id: sampleCustomer.id,
      active: 'false'
    });

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.code).toBe(ErrorCode.ValidationError);
    expect(service.setActive).not.toHaveBeenCalled();
  });

  it('converts duplicated CPF/CNPJ to public error', async () => {
    const service = createCustomerServiceMock({
      create: () => {
        throw new ApplicationError(ErrorCode.CustomerTaxIdAlreadyExists, 'internal duplicate');
      }
    });
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke<Customer>(IPC_CHANNELS.customers.create, {
      personType: 'FISICA',
      legalName: 'Maria Silva',
      taxId: '12345678901'
    });

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error).toMatchObject({
      code: ErrorCode.CustomerTaxIdAlreadyExists,
      message: 'Já existe um cliente com este CPF ou CNPJ.'
    });
  });

  it('converts database errors to public database error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = createCustomerServiceMock({
      list: () => {
        throw new ApplicationError(ErrorCode.DatabaseError, 'SQLITE_ERROR: /private/path', {
          cause: new Error('SQLITE_ERROR: /private/path')
        });
      }
    });
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke(IPC_CHANNELS.customers.list, {});
    const serialized = JSON.stringify(result);

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error).toMatchObject({
      code: ErrorCode.DatabaseError,
      message: 'Não foi possível acessar os dados dos clientes.'
    });
    expect(serialized).not.toContain('SQLITE');
    expect(serialized).not.toContain('/private/path');
    expect(consoleError).toHaveBeenCalledWith('IPC operation failed.', { name: 'Error' });

    consoleError.mockRestore();
  });

  it('converts unknown errors to internal error without stack trace', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = createCustomerServiceMock({
      list: () => {
        throw new Error('unexpected stack details');
      }
    });
    const ipcMain = registerMockHandlers(service);

    const result = await ipcMain.invoke(IPC_CHANNELS.customers.list, {});
    const serialized = JSON.stringify(result);

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error).toMatchObject({
      code: ErrorCode.InternalError,
      message: 'Ocorreu um erro inesperado.'
    });
    expect(serialized).not.toContain('stack');
    expect(serialized).not.toContain('unexpected stack details');
    expect(consoleError).toHaveBeenCalledWith('IPC operation failed.', { name: 'Error' });

    consoleError.mockRestore();
  });
});

function registerMockHandlers(customerService: CustomerServiceContract): MockIpcMain {
  const ipcMain = new MockIpcMain();

  registerIpcHandlers({
    ipcMain,
    customerService,
    backupService: createBackupServiceMock(),
    getAppVersion: () => '0.1.0'
  });

  return ipcMain;
}

function createBackupServiceMock(): BackupServiceContract {
  return {
    createBackup: vi.fn(async () => ({ success: true })),
    restoreBackup: vi.fn(async () => ({ success: true })),
    validateBackup: vi.fn(async () => ({ valid: true, version: 1 }))
  };
}

function createCustomerServiceMock(
  overrides: Partial<CustomerServiceContract> = {}
): CustomerServiceContract {
  return {
    create: vi.fn(() => sampleCustomer),
    list: vi.fn(() => ({
      items: [sampleCustomer],
      total: 1
    })),
    getById: vi.fn(() => sampleCustomer),
    update: vi.fn(() => sampleCustomer),
    setActive: vi.fn(() => sampleCustomer),
    ...overrides
  };
}

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
