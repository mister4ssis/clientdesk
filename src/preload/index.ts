import { contextBridge, ipcRenderer } from 'electron';
import { createClientDeskApi } from './clientdesk-api';

contextBridge.exposeInMainWorld('clientDesk', createClientDeskApi(ipcRenderer));
