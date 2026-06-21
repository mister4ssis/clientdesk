import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

interface ElectronAppModule {
  app?: {
    getPath(name: 'userData'): string;
  };
}

const requireElectron = createRequire(import.meta.url);

export function getDatabasePath(userDataPath = getElectronUserDataPath()): string {
  const dataDirectory = path.join(userDataPath, 'data');
  mkdirSync(dataDirectory, { recursive: true });

  return path.join(dataDirectory, 'clientdesk.sqlite');
}

function getElectronUserDataPath(): string {
  const electron = requireElectron('electron') as ElectronAppModule;

  if (!electron.app) {
    throw new Error('Electron app is not available to resolve the database path.');
  }

  return electron.app.getPath('userData');
}
