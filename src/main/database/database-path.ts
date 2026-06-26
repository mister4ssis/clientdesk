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

export function getUserDatabasePath(userId: string, userDataPath = getElectronUserDataPath()): string {
  if (!isUuid(userId)) {
    throw new Error('Invalid user id for database path.');
  }

  const userDatabaseDirectory = path.join(userDataPath, 'users', userId);
  mkdirSync(userDatabaseDirectory, { recursive: true });

  return path.join(userDatabaseDirectory, 'clientdesk.sqlite');
}

function getElectronUserDataPath(): string {
  const electron = requireElectron('electron') as ElectronAppModule;

  if (!electron.app) {
    throw new Error('Electron app is not available to resolve the database path.');
  }

  return electron.app.getPath('userData');
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
