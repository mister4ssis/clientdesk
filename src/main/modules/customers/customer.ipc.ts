import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import {
  createCustomerSchema,
  customerIdSchema,
  customerSearchFiltersSchema,
  updateCustomerSchema
} from '@shared/customers/customer.schemas';
import type { CustomerDto, CustomerListResultDto } from '@shared/customers/customer.dto';
import type { IpcResult } from '@shared/ipc/ipc-result';
import { createIpcSuccess } from '@shared/ipc/ipc-result';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import type { CustomerService } from './customer.service';
import { toIpcFailure } from '../../ipc/ipc-error-handler';

type IpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>;
export type CustomerServiceContract = Pick<
  CustomerService,
  'create' | 'list' | 'getById' | 'update' | 'setActive'
>;

interface RegisterCustomerIpcHandlersDependencies {
  ipcMain: IpcMainLike;
  customerService: CustomerServiceContract;
}

const getByIdInputSchema = z.object({
  id: customerIdSchema
});

const updateInputSchema = z.object({
  id: customerIdSchema,
  data: updateCustomerSchema
});

const setActiveInputSchema = z.object({
  id: customerIdSchema,
  active: z.boolean()
});

export function registerCustomerIpcHandlers({
  ipcMain,
  customerService
}: RegisterCustomerIpcHandlersDependencies): void {
  replaceIpcHandler(ipcMain, IPC_CHANNELS.customers.create, (_event, input: unknown) => {
    try {
      const parsedInput = createCustomerSchema.parse(input);
      return createIpcSuccess<CustomerDto>(customerService.create(parsedInput));
    } catch (error) {
      return toIpcFailure(error);
    }
  });

  replaceIpcHandler(ipcMain, IPC_CHANNELS.customers.list, (_event, filters: unknown = {}) => {
    try {
      const parsedFilters = customerSearchFiltersSchema.parse(filters ?? {});
      return createIpcSuccess<CustomerListResultDto>(customerService.list(parsedFilters));
    } catch (error) {
      return toIpcFailure(error);
    }
  });

  replaceIpcHandler(ipcMain, IPC_CHANNELS.customers.getById, (_event, input: unknown) => {
    try {
      const parsedInput = getByIdInputSchema.parse(input);
      return createIpcSuccess<CustomerDto>(customerService.getById(parsedInput.id));
    } catch (error) {
      return toIpcFailure(error);
    }
  });

  replaceIpcHandler(ipcMain, IPC_CHANNELS.customers.update, (_event, input: unknown) => {
    try {
      const parsedInput = updateInputSchema.parse(input);
      return createIpcSuccess<CustomerDto>(
        customerService.update(parsedInput.id, parsedInput.data)
      );
    } catch (error) {
      return toIpcFailure(error);
    }
  });

  replaceIpcHandler(ipcMain, IPC_CHANNELS.customers.setActive, (_event, input: unknown) => {
    try {
      const parsedInput = setActiveInputSchema.parse(input);
      return createIpcSuccess<CustomerDto>(
        customerService.setActive(parsedInput.id, parsedInput.active)
      );
    } catch (error) {
      return toIpcFailure(error);
    }
  });
}

type IpcHandler = (
  event: IpcMainInvokeEvent,
  input?: unknown
) => IpcResult<CustomerDto | CustomerListResultDto>;

function replaceIpcHandler(ipcMain: IpcMainLike, channel: string, handler: IpcHandler): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}
