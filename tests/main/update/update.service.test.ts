import { describe, expect, it, vi } from 'vitest';
import type { ElectronAutoUpdater } from '../../../src/main/modules/update/update.service';
import { UpdateService } from '../../../src/main/modules/update/update.service';
import { UpdateLifecycleService } from '../../../src/main/modules/update/update-lifecycle.service';

vi.mock('electron', () => ({
  app: {
    getVersion: () => '0.1.0'
  }
}));

vi.mock('electron-updater', () => ({
  autoUpdater: {}
}));

describe('UpdateService', () => {
  it('stays disabled by default and does not contact updater', async () => {
    const updater = createFakeUpdater();
    const service = new UpdateService(
      { enabled: false, channel: 'stable', checkDelaySeconds: 30 },
      createLifecycleService(),
      updater
    );

    const result = await service.check();

    expect(result.started).toBe(false);
    expect(result.state.status).toBe('DISABLED');
    expect(updater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('checks for updates and records available version', async () => {
    const updater = createFakeUpdater();
    updater.checkForUpdates.mockResolvedValue({
      updateInfo: {
        version: '0.2.0'
      }
    });
    const service = new UpdateService(
      { enabled: true, channel: 'stable', checkDelaySeconds: 30 },
      createLifecycleService(),
      updater
    );

    const result = await service.check();

    expect(result.started).toBe(true);
    expect(result.state.status).toBe('UPDATE_AVAILABLE');
    expect(result.state.availableVersion).toBe('0.2.0');
    expect(updater.autoDownload).toBe(false);
    expect(updater.allowDowngrade).toBe(false);
  });

  it('downloads updates manually and tracks progress', async () => {
    const updater = createFakeUpdater();
    updater.checkForUpdates.mockResolvedValue({
      updateInfo: {
        version: '0.2.0'
      }
    });
    const service = new UpdateService(
      { enabled: true, channel: 'stable', checkDelaySeconds: 30 },
      createLifecycleService(),
      updater
    );

    await service.check();
    const downloadPromise = service.download();
    updater.emitEvent('download-progress', { percent: 41.4 });
    updater.emitEvent('update-downloaded', { version: '0.2.0' });
    const result = await downloadPromise;

    expect(result.started).toBe(true);
    expect(result.state.status).toBe('DOWNLOADED');
    expect(result.state.downloadPercent).toBe(100);
  });

  it('blocks installation while a critical operation is running', async () => {
    const updater = createFakeUpdater();
    updater.checkForUpdates.mockResolvedValue({
      updateInfo: {
        version: '0.2.0'
      }
    });
    const service = new UpdateService(
      { enabled: true, channel: 'stable', checkDelaySeconds: 30 },
      createLifecycleService({ backupInProgress: true }),
      updater
    );

    await service.check();
    updater.emitEvent('update-downloaded', { version: '0.2.0' });

    expect(() => service.install()).toThrow('Operação crítica em andamento.');
    expect(updater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('stops background work and requests installation after download', async () => {
    const updater = createFakeUpdater();
    const stopBackgroundWork = vi.fn();
    const closeDatabase = vi.fn();
    updater.checkForUpdates.mockResolvedValue({
      updateInfo: {
        version: '0.2.0'
      }
    });
    const service = new UpdateService(
      { enabled: true, channel: 'stable', checkDelaySeconds: 30 },
      createLifecycleService({ stopBackgroundWork, closeDatabase }),
      updater
    );

    await service.check();
    updater.emitEvent('update-downloaded', { version: '0.2.0' });
    const result = service.install();

    expect(result.started).toBe(true);
    expect(result.state.status).toBe('INSTALLING');
    expect(stopBackgroundWork).toHaveBeenCalledOnce();
    expect(closeDatabase).toHaveBeenCalledOnce();
    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });
});

interface FakeUpdater extends ElectronAutoUpdater {
  checkForUpdates: ReturnType<typeof vi.fn>;
  downloadUpdate: ReturnType<typeof vi.fn>;
  quitAndInstall: ReturnType<typeof vi.fn>;
  emitEvent(eventName: string, payload?: unknown): void;
}

function createFakeUpdater(): FakeUpdater {
  const listeners = new Map<string, Array<(payload?: unknown) => void>>();
  const updater = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowDowngrade: true,
    allowPrerelease: false,
    channel: null,
    logger: null,
    on: vi.fn((eventName: string, listener: (payload?: unknown) => void) => {
      listeners.set(eventName, [...(listeners.get(eventName) ?? []), listener]);

      return updater;
    }),
    removeAllListeners: vi.fn((eventName: string) => {
      listeners.delete(eventName);

      return updater;
    }),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(async () => []),
    quitAndInstall: vi.fn(),
    emitEvent: (eventName: string, payload?: unknown) => {
      for (const listener of listeners.get(eventName) ?? []) {
        listener(payload);
      }
    }
  };

  return updater as unknown as FakeUpdater;
}

function createLifecycleService(
  options: {
    backupInProgress?: boolean;
    syncRunning?: boolean;
    conflictResolutionInProgress?: boolean;
    migrationInProgress?: boolean;
    stopBackgroundWork?: () => void;
    closeDatabase?: () => void;
  } = {}
): UpdateLifecycleService {
  return new UpdateLifecycleService({
    isBackupInProgress: () => options.backupInProgress ?? false,
    isSyncRunning: () => options.syncRunning ?? false,
    isConflictResolutionInProgress: () => options.conflictResolutionInProgress ?? false,
    isMigrationInProgress: () => options.migrationInProgress ?? false,
    stopBackgroundWork: options.stopBackgroundWork ?? vi.fn(),
    closeDatabase: options.closeDatabase ?? vi.fn()
  });
}
