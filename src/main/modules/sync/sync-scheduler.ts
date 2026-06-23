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
    this.requestRun();
    this.timer = setInterval(() => this.requestRun(), this.intervalMinutes * 60_000);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.started = false;
  }

  requestRun(): void {
    void this.backgroundSyncService.runNow();
  }
}
