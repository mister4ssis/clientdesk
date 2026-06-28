import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { dialog } from 'electron';
import type { DiagnosticsService } from './diagnostics.service';
import { sanitizeFileName } from './diagnostics-sanitizer';
import type { DiagnosticsExportResultDto } from '@shared/diagnostics/diagnostics.types';

export class DiagnosticsExportService {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  async export(): Promise<DiagnosticsExportResultDto> {
    const now = new Date();
    const exportedAt = now.toISOString();
    const defaultFileName = `ClientDesk-diagnostics-${formatTimestamp(now)}.json`;
    const result = await dialog.showSaveDialog({
      title: 'Exportar diagnóstico',
      defaultPath: defaultFileName,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (result.canceled || !result.filePath) {
      return {
        success: false
      };
    }

    const data = this.diagnosticsService.getExportData();
    await writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8');

    return {
      success: true,
      fileName: sanitizeFileName(path.basename(result.filePath)),
      exportedAt
    };
  }
}

function formatTimestamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}
