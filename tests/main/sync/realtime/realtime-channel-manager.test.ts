import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  RealtimeChannelManager,
  calculateReconnectDelayMs,
  type RealtimeChannelLike,
  type RealtimeClientLike
} from '@main/modules/sync/realtime/realtime-channel-manager';
import {
  buildCustomerRealtimeTopic,
  redactRealtimeTopic,
  type RealtimeSubscribeStatus
} from '@main/modules/sync/realtime/realtime-status';

const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';

describe('RealtimeChannelManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates a private channel for the authenticated user', async () => {
    const { manager, client, syncStatusService } = createManager();

    await manager.start(userA, 'access-token');

    expect(client.channels).toHaveLength(1);
    expect(client.channelCalls[0]).toEqual({
      topic: buildCustomerRealtimeTopic(userA),
      options: { config: { private: true } }
    });
    expect(client.authTokens).toEqual(['access-token']);

    client.channels[0].emitStatus('SUBSCRIBED');

    expect(syncStatusService.setRealtimeStatus).toHaveBeenCalledWith('SUBSCRIBED');
  });

  it('does not create a duplicate channel for the same user', async () => {
    const { manager, client } = createManager();

    await manager.start(userA, 'token-1');
    await manager.start(userA, 'token-2');

    expect(client.channels).toHaveLength(1);
    expect(client.authTokens).toEqual(['token-1', 'token-2']);
  });

  it('removes the old channel when the authenticated user changes', async () => {
    const { manager, client } = createManager();

    await manager.start(userA, 'token-a');
    const firstChannel = client.channels[0];
    await manager.start(userB, 'token-b');

    expect(client.removedChannels).toEqual([firstChannel]);
    expect(client.channelCalls.map((call) => call.topic)).toEqual([
      buildCustomerRealtimeTopic(userA),
      buildCustomerRealtimeTopic(userB)
    ]);
  });

  it('removes the channel on logout or shutdown', async () => {
    const { manager, client, syncStatusService } = createManager();

    await manager.start(userA, 'token-a');
    await manager.shutdown();

    expect(client.removedChannels).toEqual([client.channels[0]]);
    expect(syncStatusService.setRealtimeStatus).toHaveBeenLastCalledWith('STOPPED');
  });

  it('updates realtime auth after token refresh without logging tokens', async () => {
    const { manager, client } = createManager();

    await manager.start(userA, 'token-a');
    await manager.updateAuth('token-refreshed');

    expect(client.authTokens).toEqual(['token-a', 'token-refreshed']);
  });

  it('schedules reconnect with capped backoff after channel errors', async () => {
    const { manager, client, syncStatusService } = createManager();

    await manager.start(userA, 'token-a');
    client.channels[0].emitStatus('CHANNEL_ERROR', new Error('socket failed'));

    expect(syncStatusService.setRealtimeStatus).toHaveBeenCalledWith('RECONNECTING');
    await vi.advanceTimersByTimeAsync(1000);

    expect(client.channels).toHaveLength(2);
    expect(client.authTokens).toEqual(['token-a', 'token-a']);
  });

  it('does not reconnect while shutting down', async () => {
    const { manager, client } = createManager();

    await manager.start(userA, 'token-a');
    await manager.shutdown();
    client.channels[0].emitStatus('CLOSED');
    await vi.advanceTimersByTimeAsync(60_000);

    expect(client.channels).toHaveLength(1);
  });

  it('redacts realtime topics for diagnostics', () => {
    expect(redactRealtimeTopic(buildCustomerRealtimeTopic(userA))).toBe(
      'user:<redacted>:customers'
    );
    expect(redactRealtimeTopic('customers')).toBe('unknown-topic');
  });

  it('calculates reconnect backoff with jitter capped by configuration', () => {
    expect(calculateReconnectDelayMs(1, 60, () => 0)).toBe(1000);
    expect(calculateReconnectDelayMs(2, 60, () => 0.5)).toBe(2250);
    expect(calculateReconnectDelayMs(5, 15, () => 0)).toBe(15000);
  });
});

function createManager() {
  const client = new MockRealtimeClient();
  const syncStatusService = {
    setRealtimeStatus: vi.fn()
  };
  const onDatabaseChange = vi.fn();
  const manager = new RealtimeChannelManager(client, {
    enabled: true,
    reconnectMaxSeconds: 60,
    syncStatusService,
    onDatabaseChange
  });

  return {
    manager,
    client,
    syncStatusService,
    onDatabaseChange
  };
}

class MockRealtimeClient implements RealtimeClientLike {
  channels: MockRealtimeChannel[] = [];
  removedChannels: RealtimeChannelLike[] = [];
  authTokens: Array<string | null | undefined> = [];
  channelCalls: Array<{
    topic: string;
    options: { config: { private: boolean } };
  }> = [];
  realtime = {
    setAuth: vi.fn(async (token?: string | null) => {
      this.authTokens.push(token);
    })
  };

  channel(topic: string, options: { config: { private: boolean } }): RealtimeChannelLike {
    const channel = new MockRealtimeChannel();
    this.channels.push(channel);
    this.channelCalls.push({ topic, options });

    return channel;
  }

  async removeChannel(channel: RealtimeChannelLike): Promise<unknown> {
    this.removedChannels.push(channel);

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

  emitStatus(status: RealtimeSubscribeStatus, error?: Error): void {
    this.subscribeCallback?.(status, error);
  }
}
