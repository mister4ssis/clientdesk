import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { createIpcHandler } from '../../ipc/ipc-error-handler';
import type { CustomerAuditService } from './customer-audit.service';
import type { CustomerAuditListResultDto } from '@shared/audit/audit.types';
import { customerAuditListInputSchema } from '@shared/audit/audit.schemas';

type IpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>;

export type CustomerAuditServiceContract = Pick<CustomerAuditService, 'listByCustomer'>;

interface RegisterCustomerAuditIpcHandlersDependencies {
  ipcMain: IpcMainLike;
  customerAuditService: CustomerAuditServiceContract;
}

export function registerCustomerAuditIpcHandlers({
  ipcMain,
  customerAuditService
}: RegisterCustomerAuditIpcHandlersDependencies): void {
  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.audit.listCustomerHistory,
    createIpcHandler<CustomerAuditListResultDto>(
      IPC_CHANNELS.audit.listCustomerHistory,
      (_event, input: unknown) => {
        const parsedInput = customerAuditListInputSchema.parse(input);

        return customerAuditService.listByCustomer(
          parsedInput.customerId,
          parsedInput.filters ?? {}
        );
      }
    )
  );
}

type IpcHandler = (event: IpcMainInvokeEvent, input?: unknown) => Promise<unknown>;

function replaceIpcHandler(ipcMain: IpcMainLike, channel: string, handler: IpcHandler): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}
