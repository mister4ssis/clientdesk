import type { ClientDeskSupabaseClient } from '../../../integrations/supabase/supabase-client';
import type { SyncStatusService } from '../sync-status.service';
import {
  buildCustomerRealtimeTopic,
  redactRealtimeTopic,
  type RealtimeSubscribeStatus
} from './realtime-status';

export interface RealtimeChannelLike {
  on(
    type: 'broadcast',
    filter: { event: string },
    callback: (payload: unknown) => void
  ): RealtimeChannelLike;
  subscribe(
    callback: (status: RealtimeSubscribeStatus, error?: Error) => void
  ): RealtimeChannelLike;
}

export interface RealtimeClientLike {
  channel(topic: string, options: { config: { private: boolean } }): RealtimeChannelLike;
  removeChannel(channel: RealtimeChannelLike): Promise<unknown>;
  realtime: {
    setAuth(token?: string | null): Promise<void>;
  };
}

export interface RealtimeChannelManagerOptions {
  enabled: boolean;
  reconnectMaxSeconds: number;
  syncStatusService: Pick<SyncStatusService, 'setRealtimeStatus'>;
  onDatabaseChange: (payload: unknown) => void;
}

export class RealtimeChannelManager {
  private channel: RealtimeChannelLike | null = null;
  private currentUserId: string | null = null;
  private currentTopic: string | null = null;
  private currentAccessToken: string | null = null;
  private shuttingDown = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly client: RealtimeClientLike | ClientDeskSupabaseClient | null,
    private readonly options: RealtimeChannelManagerOptions
  ) {
    if (!options.enabled) {
      options.syncStatusService.setRealtimeStatus('DISABLED');
    }
  }

  async start(userId: string, accessToken: string | null): Promise<void> {
    if (!this.options.enabled || this.shuttingDown || !this.client) {
      this.options.syncStatusService.setRealtimeStatus(
        this.options.enabled ? 'AUTH_ERROR' : 'DISABLED'
      );
      return;
    }

    const topic = buildCustomerRealtimeTopic(userId);

    if (this.channel && this.currentTopic === topic) {
      await this.updateAuth(accessToken);
      return;
    }

    await this.stop('STOPPED');
    this.shuttingDown = false;
    this.currentUserId = userId;
    this.currentTopic = topic;
    await this.updateAuth(accessToken);
    this.options.syncStatusService.setRealtimeStatus('CONNECTING');
    this.channel = this.asRealtimeClient()
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: '*' }, (payload) => {
        this.options.onDatabaseChange(payload);
      })
      .subscribe((status, error) => {
        this.handleSubscribeStatus(status, error);
      });
    logRealtimeChannel('REALTIME_CHANNEL_CONNECTING', topic);
  }

  async updateAuth(accessToken: string | null): Promise<void> {
    this.currentAccessToken = accessToken;

    if (!this.client || !this.options.enabled) {
      return;
    }

    await this.asRealtimeClient().realtime.setAuth(accessToken);
  }

  async stop(status: 'STOPPED' | 'DISABLED' | 'AUTH_ERROR' = 'STOPPED'): Promise<void> {
    this.clearReconnectTimer();

    if (this.channel && this.client) {
      await this.asRealtimeClient().removeChannel(this.channel);
    }

    this.channel = null;
    this.currentTopic = null;
    this.currentUserId = null;
    this.currentAccessToken = null;
    this.reconnectAttempts = 0;
    this.options.syncStatusService.setRealtimeStatus(status);
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    await this.stop('STOPPED');
  }

  private handleSubscribeStatus(status: RealtimeSubscribeStatus, error?: Error): void {
    switch (status) {
      case 'SUBSCRIBED':
        this.reconnectAttempts = 0;
        this.options.syncStatusService.setRealtimeStatus('SUBSCRIBED');
        logRealtimeChannel('REALTIME_CHANNEL_SUBSCRIBED', this.currentTopic);
        return;
      case 'CHANNEL_ERROR':
        this.options.syncStatusService.setRealtimeStatus('CHANNEL_ERROR');
        this.scheduleReconnect('CHANNEL_ERROR');
        logRealtimeChannel('REALTIME_CHANNEL_ERROR', this.currentTopic, error?.name);
        return;
      case 'TIMED_OUT':
        this.options.syncStatusService.setRealtimeStatus('TIMED_OUT');
        this.scheduleReconnect('TIMED_OUT');
        logRealtimeChannel('REALTIME_CHANNEL_TIMED_OUT', this.currentTopic);
        return;
      case 'CLOSED':
        if (!this.shuttingDown) {
          this.options.syncStatusService.setRealtimeStatus('RECONNECTING');
          this.scheduleReconnect('CLOSED');
        }
        return;
    }
  }

  private scheduleReconnect(reason: RealtimeSubscribeStatus): void {
    if (this.shuttingDown || !this.currentUserId || !this.options.enabled || this.reconnectTimer) {
      return;
    }

    this.options.syncStatusService.setRealtimeStatus('RECONNECTING');
    this.reconnectAttempts += 1;
    const delayMs = calculateReconnectDelayMs(
      this.reconnectAttempts,
      this.options.reconnectMaxSeconds
    );
    const userId = this.currentUserId;
    const accessToken = this.currentAccessToken;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.reconnect(userId, accessToken);
    }, delayMs);
    this.reconnectTimer.unref?.();
    logRealtimeChannel('REALTIME_CHANNEL_RECONNECT_SCHEDULED', this.currentTopic, reason);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async reconnect(userId: string, accessToken: string | null): Promise<void> {
    if (this.channel && this.client) {
      await this.asRealtimeClient().removeChannel(this.channel);
    }

    this.channel = null;
    this.currentTopic = null;
    this.currentUserId = null;
    await this.start(userId, accessToken);
  }

  private asRealtimeClient(): RealtimeClientLike {
    return this.client as unknown as RealtimeClientLike;
  }
}

export function calculateReconnectDelayMs(
  attempts: number,
  maxSeconds: number,
  nowRandom = Math.random
): number {
  const baseSeconds =
    attempts <= 1 ? 1 : attempts === 2 ? 2 : attempts === 3 ? 5 : attempts === 4 ? 15 : attempts === 5 ? 30 : 60;
  const cappedSeconds = Math.min(baseSeconds, maxSeconds);
  const jitterMs = Math.floor(nowRandom() * 500);

  return cappedSeconds * 1000 + jitterMs;
}

function logRealtimeChannel(event: string, topic: string | null, code?: string): void {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  console.info('[realtime-sync]', {
    event,
    topic: topic ? redactRealtimeTopic(topic) : null,
    code: code ?? null
  });
}
