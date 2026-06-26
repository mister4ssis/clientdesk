import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  SecureSessionStorage,
  type SecureStorageAdapter
} from '@main/modules/auth/secure-session-storage';
import { createTempDirectory, removeTempDirectory } from '../../helpers/temp-directory';

let tempDirectory: string;

beforeEach(() => {
  tempDirectory = createTempDirectory('clientdesk-secure-storage-');
});

afterEach(() => {
  removeTempDirectory(tempDirectory);
});

describe('SecureSessionStorage', () => {
  it('saves encrypted content and reads it back', () => {
    const storage = new SecureSessionStorage({
      userDataPath: tempDirectory,
      safeStorage: createSafeStorage()
    });

    storage.setItem('session', 'token-value');

    expect(storage.getItem('session')).toBe('token-value');
    expect(readFileSync(storage.getStorageFilePath(), 'utf8')).not.toContain('token-value');
  });

  it('removes persisted content', () => {
    const storage = new SecureSessionStorage({
      userDataPath: tempDirectory,
      safeStorage: createSafeStorage()
    });

    storage.setItem('session', 'token-value');
    storage.clear();

    expect(storage.getItem('session')).toBeNull();
    expect(existsSync(storage.getStorageFilePath())).toBe(false);
  });

  it('uses memory only when encryption is unavailable', () => {
    const storage = new SecureSessionStorage({
      userDataPath: tempDirectory,
      safeStorage: createSafeStorage(false)
    });

    storage.setItem('session', 'token-value');

    expect(storage.getItem('session')).toBe('token-value');
    expect(existsSync(path.join(tempDirectory, 'auth', 'session.enc'))).toBe(false);
  });

  it('returns null for corrupted encrypted content', () => {
    const safeStorage = createSafeStorage();
    const storage = new SecureSessionStorage({
      userDataPath: tempDirectory,
      safeStorage
    });

    storage.setItem('session', 'token-value');
    safeStorage.decryptString = () => '{broken';

    expect(storage.getItem('session')).toBeNull();
  });
});

function createSafeStorage(encryptionAvailable = true): SecureStorageAdapter {
  return {
    isEncryptionAvailable: () => encryptionAvailable,
    encryptString: (value) => Buffer.from(value.split('').reverse().join(''), 'utf8'),
    decryptString: (value) => value.toString('utf8').split('').reverse().join('')
  };
}
