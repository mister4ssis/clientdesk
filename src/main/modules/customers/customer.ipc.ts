import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import {
  createCustomerSchema,
  customerIdSchema,
  customerSearchFiltersSchema,
  updateCustomerSchema
} from '@shared/customers/customer.schemas';
import type { CustomerDto, CustomerListResultDto } from '@shared/customers/customer.dto';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import type { CustomerService } from './customer.service';
import { createIpcHandler } from '../../ipc/ipc-error-handler';

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
  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.customers.create,
    createIpcHandler<CustomerDto>(IPC_CHANNELS.customers.create, (_event, input: unknown) => {
      const parsedInput = createCustomerSchema.parse(input);
      return customerService.create(parsedInput);
    })
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.customers.list,
    createIpcHandler<CustomerListResultDto>(
      IPC_CHANNELS.customers.list,
      (_event, filters: unknown = {}) => {
        const parsedFilters = customerSearchFiltersSchema.parse(filters ?? {});
        return customerService.list(parsedFilters);
      }
    )
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.customers.getById,
    createIpcHandler<CustomerDto>(IPC_CHANNELS.customers.getById, (_event, input: unknown) => {
      const parsedInput = getByIdInputSchema.parse(input);
      return customerService.getById(parsedInput.id);
    })
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.customers.update,
    createIpcHandler<CustomerDto>(IPC_CHANNELS.customers.update, (_event, input: unknown) => {
      const parsedInput = updateInputSchema.parse(input);
      return customerService.update(parsedInput.id, parsedInput.data);
    })
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.customers.setActive,
    createIpcHandler<CustomerDto>(IPC_CHANNELS.customers.setActive, (_event, input: unknown) => {
      const parsedInput = setActiveInputSchema.parse(input);
      return customerService.setActive(parsedInput.id, parsedInput.active);
    })
  );
}

type IpcHandler = (
  event: IpcMainInvokeEvent,
  input?: unknown
) => Promise<unknown>;

function replaceIpcHandler(ipcMain: IpcMainLike, channel: string, handler: IpcHandler): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}
