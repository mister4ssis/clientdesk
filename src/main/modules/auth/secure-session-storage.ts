import { safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface SecureStorageAdapter {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}

export interface SecureSessionStorageOptions {
  userDataPath: string;
  fileName?: string;
  safeStorage?: SecureStorageAdapter;
}

type StorageRecord = Record<string, string>;

export class SecureSessionStorage {
  private readonly filePath: string;
  private readonly memoryStorage: StorageRecord = {};
  private readonly safeStorage: SecureStorageAdapter;

  constructor(options: SecureSessionStorageOptions) {
    this.filePath = path.join(options.userDataPath, 'auth', options.fileName ?? 'session.enc');
    this.safeStorage = options.safeStorage ?? safeStorage;
  }

  getItem(key: string): string | null {
    return this.readRecord()[key] ?? null;
  }

  setItem(key: string, value: string): void {
    const record = this.readRecord();
    record[key] = value;
    this.writeRecord(record);
  }

  removeItem(key: string): void {
    const record = this.readRecord();
    delete record[key];
    this.writeRecord(record);
  }

  clear(): void {
    for (const key of Object.keys(this.memoryStorage)) {
      delete this.memoryStorage[key];
    }

    if (existsSync(this.filePath)) {
      rmSync(this.filePath, { force: true });
    }
  }

  isPersistent(): boolean {
    return this.safeStorage.isEncryptionAvailable();
  }

  getStorageFilePath(): string {
    return this.filePath;
  }

  private readRecord(): StorageRecord {
    if (!this.safeStorage.isEncryptionAvailable()) {
      return { ...this.memoryStorage };
    }

    if (!existsSync(this.filePath)) {
      return {};
    }

    try {
      const encrypted = readFileSync(this.filePath);
      const decrypted = this.safeStorage.decryptString(encrypted);
      const parsed = JSON.parse(decrypted) as unknown;

      return isStorageRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeRecord(record: StorageRecord): void {
    if (!this.safeStorage.isEncryptionAvailable()) {
      for (const key of Object.keys(this.memoryStorage)) {
        delete this.memoryStorage[key];
      }

      Object.assign(this.memoryStorage, record);
      return;
    }

    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const encrypted = this.safeStorage.encryptString(JSON.stringify(record));
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, encrypted);
    renameSync(temporaryPath, this.filePath);
  }
}

function isStorageRecord(value: unknown): value is StorageRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((item) => typeof item === 'string');
}
