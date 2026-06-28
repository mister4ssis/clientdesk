import { describe, expect, it, vi } from 'vitest';
import { registerCustomerAuditIpcHandlers } from '@main/modules/audit/customer-audit.ipc';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';

describe('customer audit IPC handlers', () => {
  it('registers customer history channel', async () => {
    const ipcMain = createMockIpcMain();
    const customerAuditService = {
      listByCustomer: vi.fn(() => ({ items: [auditEntry], total: 1 }))
    };

    registerCustomerAuditIpcHandlers({
      ipcMain,
      customerAuditService
    });

    expect(ipcMain.registeredChannels()).toEqual([
      IPC_CHANNELS.audit.listCustomerHistory
    ]);
    await expect(
      ipcMain.invoke(IPC_CHANNELS.audit.listCustomerHistory, {
        customerId,
        filters: {
          limit: 10
        }
      })
    ).resolves.toMatchObject({
      success: true,
      data: {
        total: 1,
        items: [auditEntry]
      }
    });
    expect(customerAuditService.listByCustomer).toHaveBeenCalledWith(customerId, {
      limit: 10
    });
  });
});

const customerId = '11111111-1111-4111-8111-111111111111';

const auditEntry = {
  id: '22222222-2222-4222-8222-222222222222',
  customerId,
  operation: 'UPDATED' as const,
  source: 'LOCAL_USER' as const,
  changedFields: ['legalName'],
  installationIdShort: '33333333-333',
  localVersion: '2026-06-25T10:00:00.000Z',
  remoteVersion: null,
  createdAt: '2026-06-25T10:00:00.000Z'
};

function createMockIpcMain() {
  const handlers = new Map<string, (event: unknown, input?: unknown) => unknown>();

  return {
    handle: vi.fn((channel: string, handler: (event: unknown, input?: unknown) => unknown) => {
      handlers.set(channel, handler);
    }),
    removeHandler: vi.fn((channel: string) => {
      handlers.delete(channel);
    }),
    registeredChannels: () => Array.from(handlers.keys()),
    invoke: async (channel: string, input?: unknown) => {
      const handler = handlers.get(channel);

      if (!handler) {
        throw new Error(`Missing handler: ${channel}`);
      }

      return handler({}, input);
    }
  };
}
