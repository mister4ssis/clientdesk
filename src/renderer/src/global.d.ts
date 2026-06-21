import type { ClientDeskApi } from '@shared/ipc/ipc-contracts';

declare global {
  interface Window {
    clientDesk: ClientDeskApi;
  }
}

export {};
