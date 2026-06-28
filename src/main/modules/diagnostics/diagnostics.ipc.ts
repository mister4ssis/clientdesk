import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { createIpcHandler } from '../../ipc/ipc-error-handler';
import type { DiagnosticsService } from './diagnostics.service';
import type { DiagnosticsExportService } from './diagnostics-export.service';
import type {
  DiagnosticsExportResultDto,
  DiagnosticsSummaryDto,
  SyncRunLogDto
} from '@shared/diagnostics/diagnostics.types';
import { syncRunLogFiltersSchema } from '@shared/diagnostics/diagnostics.schemas';

type IpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>;

export type DiagnosticsServiceContract = Pick<
  DiagnosticsService,
  'getSummary' | 'listSyncRuns'
>;
export type DiagnosticsExportServiceContract = Pick<DiagnosticsExportService, 'export'>;

interface RegisterDiagnosticsIpcHandlersDependencies {
  ipcMain: IpcMainLike;
  diagnosticsService: DiagnosticsServiceContract;
  diagnosticsExportService: DiagnosticsExportServiceContract;
}

export function registerDiagnosticsIpcHandlers({
  ipcMain,
  diagnosticsService,
  diagnosticsExportService
}: RegisterDiagnosticsIpcHandlersDependencies): void {
  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.diagnostics.getSummary,
    createIpcHandler<DiagnosticsSummaryDto>(IPC_CHANNELS.diagnostics.getSummary, () =>
      diagnosticsService.getSummary()
    )
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.diagnostics.listSyncRuns,
    createIpcHandler<SyncRunLogDto[]>(
      IPC_CHANNELS.diagnostics.listSyncRuns,
      (_event, input: unknown) => {
        const parsedInput = syncRunLogFiltersSchema.parse(input ?? {});

        return diagnosticsService.listSyncRuns(parsedInput);
      }
    )
  );

  replaceIpcHandler(
    ipcMain,
    IPC_CHANNELS.diagnostics.export,
    createIpcHandler<DiagnosticsExportResultDto>(IPC_CHANNELS.diagnostics.export, () =>
      diagnosticsExportService.export()
    )
  );
}

type IpcHandler = (event: IpcMainInvokeEvent, input?: unknown) => Promise<unknown>;

function replaceIpcHandler(ipcMain: IpcMainLike, channel: string, handler: IpcHandler): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}
