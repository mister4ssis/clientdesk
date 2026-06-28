import { app } from 'electron';
import type { AppUpdater } from 'electron-updater';
import { autoUpdater } from 'electron-updater';
import type { ProgressInfo, UpdateCheckResult, UpdateInfo } from 'electron-updater';
import type { UpdateOperationResult, UpdateState } from '@shared/update/update.types';
import { ApplicationError } from '../../errors/application-error';
import { ErrorCode } from '../../errors/error-codes';
import type { UpdateConfig } from './update-config';
import type { UpdateLifecycleService } from './update-lifecycle.service';

export type ElectronAutoUpdater = Pick<
  AppUpdater,
  | 'autoDownload'
  | 'autoInstallOnAppQuit'
  | 'allowDowngrade'
  | 'allowPrerelease'
  | 'channel'
  | 'logger'
  | 'on'
  | 'removeAllListeners'
  | 'checkForUpdates'
  | 'downloadUpdate'
  | 'quitAndInstall'
>;

export class UpdateService {
  private state: UpdateState;
  private initialized = false;

  constructor(
    private readonly config: UpdateConfig,
    private readonly lifecycleService: UpdateLifecycleService,
    private readonly updater: ElectronAutoUpdater = autoUpdater
  ) {
    this.state = {
      status: config.enabled ? 'IDLE' : 'DISABLED',
      currentVersion: app.getVersion(),
      availableVersion: null,
      downloadPercent: null,
      lastCheckedAt: null,
      errorCode: null
    };
  }

  initialize(): void {
    if (this.initialized || !this.config.enabled) {
      return;
    }

    this.initialized = true;
    this.updater.autoDownload = false;
    this.updater.autoInstallOnAppQuit = false;
    this.updater.allowPrerelease = this.config.channel === 'beta';
    this.updater.channel = this.config.channel === 'beta' ? 'beta' : null;
    this.updater.allowDowngrade = false;
    this.updater.logger = null;

    this.updater.on('checking-for-update', () => {
      this.patchState({
        status: 'CHECKING',
        errorCode: null,
        lastCheckedAt: new Date().toISOString()
      });
    });
    this.updater.on('update-available', (info: UpdateInfo) => {
      this.patchState({
        status: 'UPDATE_AVAILABLE',
        availableVersion: info.version,
        downloadPercent: null,
        errorCode: null
      });
    });
    this.updater.on('update-not-available', () => {
      this.patchState({
        status: 'UPDATE_NOT_AVAILABLE',
        availableVersion: null,
        downloadPercent: null,
        errorCode: null
      });
    });
    this.updater.on('download-progress', (progress: ProgressInfo) => {
      this.patchState({
        status: 'DOWNLOADING',
        downloadPercent: normalizePercent(progress.percent),
        errorCode: null
      });
    });
    this.updater.on('update-downloaded', (info: UpdateInfo) => {
      this.patchState({
        status: 'DOWNLOADED',
        availableVersion: info.version,
        downloadPercent: 100,
        errorCode: null
      });
    });
    this.updater.on('error', () => {
      this.patchState({
        status: 'ERROR',
        errorCode: ErrorCode.UpdateCheckFailed
      });
    });
  }

  stop(): void {
    this.updater.removeAllListeners('checking-for-update');
    this.updater.removeAllListeners('update-available');
    this.updater.removeAllListeners('update-not-available');
    this.updater.removeAllListeners('download-progress');
    this.updater.removeAllListeners('update-downloaded');
    this.updater.removeAllListeners('error');
    this.initialized = false;
  }

  getState(): UpdateState {
    return { ...this.state };
  }

  async check(): Promise<UpdateOperationResult> {
    if (!this.config.enabled) {
      return {
        started: false,
        state: this.getState()
      };
    }

    this.initialize();

    try {
      this.patchState({
        status: 'CHECKING',
        lastCheckedAt: new Date().toISOString(),
        errorCode: null
      });
      const result = await this.updater.checkForUpdates();
      this.applyCheckResult(result);

      return {
        started: true,
        state: this.getState()
      };
    } catch (error) {
      this.patchState({
        status: 'ERROR',
        errorCode: ErrorCode.UpdateCheckFailed
      });
      throw new ApplicationError(ErrorCode.UpdateCheckFailed, 'Falha ao verificar atualização.', {
        cause: error
      });
    }
  }

  async download(): Promise<UpdateOperationResult> {
    if (!this.config.enabled) {
      return {
        started: false,
        state: this.getState()
      };
    }

    if (this.state.status !== 'UPDATE_AVAILABLE') {
      throw new ApplicationError(ErrorCode.UpdateNotAvailable, 'Atualização não disponível.');
    }

    try {
      this.patchState({
        status: 'DOWNLOADING',
        downloadPercent: 0,
        errorCode: null
      });
      await this.updater.downloadUpdate();

      return {
        started: true,
        state: this.getState()
      };
    } catch (error) {
      this.patchState({
        status: 'ERROR',
        errorCode: ErrorCode.UpdateDownloadFailed
      });
      throw new ApplicationError(ErrorCode.UpdateDownloadFailed, 'Falha ao baixar atualização.', {
        cause: error
      });
    }
  }

  install(): UpdateOperationResult {
    if (!this.config.enabled) {
      return {
        started: false,
        state: this.getState()
      };
    }

    if (this.state.status !== 'DOWNLOADED') {
      throw new ApplicationError(ErrorCode.UpdateNotDownloaded, 'Atualização não baixada.');
    }

    this.lifecycleService.prepareForInstall();
    this.patchState({
      status: 'INSTALLING',
      errorCode: null
    });
    this.updater.quitAndInstall(false, true);

    return {
      started: true,
      state: this.getState()
    };
  }

  private applyCheckResult(result: UpdateCheckResult | null): void {
    if (!result) {
      this.patchState({
        status: 'UPDATE_NOT_AVAILABLE',
        availableVersion: null,
        downloadPercent: null,
        errorCode: null
      });
      return;
    }

    const version = result.updateInfo.version;
    const status = version === this.state.currentVersion ? 'UPDATE_NOT_AVAILABLE' : 'UPDATE_AVAILABLE';

    this.patchState({
      status,
      availableVersion: status === 'UPDATE_AVAILABLE' ? version : null,
      downloadPercent: null,
      errorCode: null
    });
  }

  private patchState(patch: Partial<UpdateState>): void {
    this.state = {
      ...this.state,
      ...patch
    };
  }
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}
