import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function createTempDirectory(prefix: string): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

export function removeTempDirectory(directory: string): void {
  rmSync(directory, { force: true, recursive: true });
}
