import type { BackgroundSyncService } from './background-sync.service';

export class SyncScheduler {
  private timer: NodeJS.Timeout | null = null;
  private started = false;

  constructor(
    private readonly backgroundSyncService: BackgroundSyncService,
    private readonly intervalMinutes: number,
    private readonly enabled: boolean
  ) {}

  start(): void {
    if (this.started || !this.enabled) {
      return;
    }

    this.started = true;
    this.requestRun('STARTUP');
    this.timer = setInterval(() => this.requestRun('PERIODIC'), this.intervalMinutes * 60_000);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.started = false;
  }

  requestRun(reason: 'STARTUP' | 'PERIODIC' | 'LOCAL_CHANGE' = 'PERIODIC'): void {
    if (reason === 'STARTUP') {
      void this.backgroundSyncService.run('STARTUP');
      return;
    }

    if (reason === 'LOCAL_CHANGE') {
      void this.backgroundSyncService.requestSync({ reason: 'LOCAL_CHANGE' });
      return;
    }

    void this.backgroundSyncService.requestSync({ reason: 'SCHEDULER' });
  }
}
