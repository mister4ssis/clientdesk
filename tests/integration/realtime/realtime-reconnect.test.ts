import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RealtimeChannelManager,
  type RealtimeChannelLike,
  type RealtimeClientLike
} from '@main/modules/sync/realtime/realtime-channel-manager';
import type { RealtimeSubscribeStatus } from '@main/modules/sync/realtime/realtime-status';

const userId = '11111111-1111-4111-8111-111111111111';

describe('realtime reconnect integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reconnects after a timed out channel without disabling polling', async () => {
    const client = new MockRealtimeClient();
    const syncStatusService = { setRealtimeStatus: vi.fn() };
    const manager = new RealtimeChannelManager(client, {
      enabled: true,
      reconnectMaxSeconds: 60,
      syncStatusService,
      onDatabaseChange: vi.fn()
    });

    await manager.start(userId, 'token-a');
    client.channels[0].emitStatus('TIMED_OUT');
    await vi.advanceTimersByTimeAsync(1000);

    expect(client.channels).toHaveLength(2);
    expect(syncStatusService.setRealtimeStatus).toHaveBeenCalledWith('TIMED_OUT');
    expect(syncStatusService.setRealtimeStatus).toHaveBeenCalledWith('RECONNECTING');
  });

  it('cancels retry after logout', async () => {
    const client = new MockRealtimeClient();
    const manager = new RealtimeChannelManager(client, {
      enabled: true,
      reconnectMaxSeconds: 60,
      syncStatusService: { setRealtimeStatus: vi.fn() },
      onDatabaseChange: vi.fn()
    });

    await manager.start(userId, 'token-a');
    client.channels[0].emitStatus('CHANNEL_ERROR');
    await manager.stop();
    await vi.advanceTimersByTimeAsync(1000);

    expect(client.channels).toHaveLength(1);
  });
});

class MockRealtimeClient implements RealtimeClientLike {
  channels: MockRealtimeChannel[] = [];
  realtime = {
    setAuth: vi.fn(async () => undefined)
  };

  channel(): RealtimeChannelLike {
    const channel = new MockRealtimeChannel();
    this.channels.push(channel);

    return channel;
  }

  async removeChannel(): Promise<unknown> {
    return null;
  }
}

class MockRealtimeChannel implements RealtimeChannelLike {
  private subscribeCallback: ((status: RealtimeSubscribeStatus, error?: Error) => void) | null =
    null;

  on(): RealtimeChannelLike {
    return this;
  }

  subscribe(
    callback: (status: RealtimeSubscribeStatus, error?: Error) => void
  ): RealtimeChannelLike {
    this.subscribeCallback = callback;

    return this;
  }

  emitStatus(status: RealtimeSubscribeStatus): void {
    this.subscribeCallback?.(status);
  }
}
