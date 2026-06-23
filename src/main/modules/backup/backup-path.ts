import { mkdirSync } from 'node:fs';
import path from 'node:path';

export function getAutomaticBackupDirectory(userDataPath: string): string {
  const backupDirectory = path.join(userDataPath, 'backups');
  mkdirSync(backupDirectory, { recursive: true });

  return backupDirectory;
}

export function createBackupFileName(date = new Date()): string {
  return `ClientDesk-backup-${formatDate(date)}-${formatTime(date)}.sqlite`;
}

export function createBeforeRestoreBackupFileName(date = new Date()): string {
  return `before-restore-${formatDate(date)}-${formatTimeWithSeconds(date)}.sqlite`;
}

function formatDate(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-');
}

function formatTime(date: Date): string {
  return `${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function formatTimeWithSeconds(date: Date): string {
  return `${formatTime(date)}${pad(date.getSeconds())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
